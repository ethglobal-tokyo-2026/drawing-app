// @vitest-environment happy-dom
import type { AgeVerificationRequest, Me } from "@drawing-app/api/client";
import { IDKitErrorCodes, type IDKitRequestWidgetProps, type IDKitResult } from "@worldcoin/idkit";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../../api/apiClient";
import { emptyApi, renderWithApi, TEST_ME } from "../../api/testing";
import { errors } from "../../i18n/strings/errors";
import { AgeVerificationNote } from "./AgeVerificationNote";

/** IDKit's widget as the paper last rendered it; null while it isn't shown. */
let widget: IDKitRequestWidgetProps | null = null;
vi.mock("@worldcoin/idkit", () => ({
  IDKitErrorCodes: {
    UserRejected: "user_rejected",
    Cancelled: "cancelled",
    FailedByHostApp: "failed_by_host_app",
    CredentialUnavailable: "credential_unavailable",
  },
  proofOfHuman: () => ({ type: "ProofOfHuman" }),
  IDKitRequestWidget: (props: IDKitRequestWidgetProps) => {
    widget = props;
    return null;
  },
}));

const REQUEST: AgeVerificationRequest = {
  appId: "app_test",
  action: "croquis-age-18",
  environment: "production",
  rpContext: { rp_id: "rp_test", nonce: "0x01", created_at: 1, expires_at: 301, signature: "0x02" },
};

const PROOF = {
  protocol_version: "4.0",
  nonce: "0x01",
  action: "croquis-age-18",
  environment: "production",
  responses: [
    {
      identifier: "proof_of_human",
      proof: [],
      nullifier: "0x05",
      issuer_schema_id: 1,
      expires_at_min: 0,
    },
  ],
} satisfies IDKitResult;

const VERIFIED: Me = { ...TEST_ME, ageVerifiedAt: "2026-09-27T00:00:00.000Z" };

let unmount = () => {};
afterEach(() => {
  unmount();
  widget = null;
  vi.restoreAllMocks();
});

function render(overrides: Partial<ApiClient> = {}, me: Me = TEST_ME) {
  const view = renderWithApi(
    <AgeVerificationNote />,
    emptyApi({ ageVerificationRequest: () => Promise.resolve(REQUEST), ...overrides }),
    me,
  );
  unmount = view.unmount;
  return view.host;
}

const button = (host: HTMLElement) => host.querySelector("button");
const alert = (host: HTMLElement) => host.querySelector('[role="alert"]')?.textContent;

/** Taps Verify your age, and waits for World ID to show. */
async function openWorldId(host: HTMLElement) {
  await act(async () => button(host)?.click());
  await vi.waitFor(() => expect(widget).not.toBeNull());
  const shown = widget;
  if (!shown) throw new Error("World ID didn't show");
  return shown;
}

/** World App hands the widget `result`, as IDKit does; IDKit then reports its failure, if any. */
async function worldAppSends(shown: IDKitRequestWidgetProps, result: IDKitResult) {
  await act(async () => {
    try {
      await shown.handleVerify?.(result);
      await shown.onSuccess(result);
    } catch {
      await shown.onError?.(IDKitErrorCodes.FailedByHostApp);
    }
  });
}

describe("the Age verification paper", () => {
  it("asks World ID for an Orb proof, taking older World IDs too, and shows you verified once the server takes it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const verifyAge = vi.fn<ApiClient["verifyAge"]>(() => Promise.resolve(VERIFIED));
    const host = render({ verifyAge });
    const shown = await openWorldId(host);
    expect(shown).toMatchObject({
      app_id: REQUEST.appId,
      action: REQUEST.action,
      rp_context: REQUEST.rpContext,
      allow_legacy_proofs: true,
      preset: { type: "ProofOfHuman" },
    });
    await worldAppSends(shown, PROOF);
    expect(verifyAge).toHaveBeenCalledExactlyOnceWith(PROOF);
    expect(host.textContent).toContain("Verified 18+ with World ID");
    expect(button(host)).toBeNull();
  });

  it("says why, when the server refuses the proof", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const used = new ApiError(409, { error: "age_verification_used" });
    const host = render({ verifyAge: () => Promise.reject(used) });
    await worldAppSends(await openWorldId(host), PROOF);
    expect(alert(host)).toContain(errors.age_verification_used.en);
    expect(button(host)?.disabled).toBe(false);
  });

  it("sends nothing for a proof without the action, and says so", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const verifyAge = vi.fn<ApiClient["verifyAge"]>();
    const host = render({ verifyAge });
    const noAction = {
      protocol_version: "3.0",
      nonce: "0x01",
      responses: [],
      environment: "production",
    } satisfies IDKitResult;
    await worldAppSends(await openWorldId(host), noAction);
    expect(verifyAge).not.toHaveBeenCalled();
    expect(alert(host)).toContain("different kind of proof");
  });

  it("names World App's failure, and says nothing when you close World ID yourself", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const host = render();
    const closedByYou = await openWorldId(host);
    await act(async () => closedByYou.onError?.(IDKitErrorCodes.UserRejected));
    expect(alert(host)).toBeUndefined();

    widget = null;
    const failing = await openWorldId(host);
    await act(async () => failing.onError?.(IDKitErrorCodes.CredentialUnavailable));
    expect(alert(host)).toContain("World App couldn’t finish");
    expect(host.textContent).toContain("credential_unavailable");
  });

  it("says why World ID couldn't open", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const off = new ApiError(404, { error: "age_verification_not_configured" });
    const host = render({ ageVerificationRequest: () => Promise.reject(off) });
    await act(async () => button(host)?.click());
    expect(alert(host)).toContain(errors.age_verification_not_configured.en);
    expect(widget).toBeNull();
  });

  it("keeps its button, face and focus while World ID opens, and takes no second press", async () => {
    const request = vi.fn<ApiClient["ageVerificationRequest"]>(() => new Promise(() => {}));
    const host = render({ ageVerificationRequest: request });
    const verify = button(host);
    act(() => verify?.focus());
    await act(async () => verify?.click());
    expect(verify?.disabled).toBe(false);
    expect(verify?.getAttribute("aria-busy")).toBe("true");
    expect(verify?.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(verify);
    await act(async () => verify?.click());
    expect(request).toHaveBeenCalledOnce();
  });

  it("shows you verified, with nothing to tap, once you are", () => {
    const host = render({}, VERIFIED);
    expect(host.textContent).toContain("Verified 18+ with World ID");
    expect(button(host)).toBeNull();
  });

  it("says what an Orb is only while there's something to verify", () => {
    const orbLine = (host: HTMLElement) => host.querySelector(".age-verification-note__orb");
    expect(orbLine(render())?.textContent).toBeTruthy();
    unmount();
    expect(orbLine(render({}, VERIFIED))).toBeNull();
  });
});
