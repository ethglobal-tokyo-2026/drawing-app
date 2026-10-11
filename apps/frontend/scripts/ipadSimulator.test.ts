import { describe, expect, it, vi } from "vitest";
import { IpadSimulator } from "./ipadSimulator";

describe("iPad simulator ownership", () => {
  it("shuts down its own device after bootstatus fails during startup", async () => {
    const command = vi.fn(async (_tool: string, args: string[]) => {
      if (args.includes("bootstatus")) throw new Error("bootstatus failed");
    });
    const ipad = new IpadSimulator("chosen-ipad", false, command);
    await expect(ipad.boot()).rejects.toThrow("bootstatus failed");
    await ipad.shutdown();
    expect(command.mock.calls.map(([tool, args]) => [tool, args])).toEqual([
      ["simctl", ["boot", "chosen-ipad"]],
      ["simctl", ["bootstatus", "chosen-ipad", "-b"]],
      ["simctl", ["shutdown", "chosen-ipad"]],
    ]);
  });

  it("leaves a previously booted device running", async () => {
    const command = vi.fn(async () => {});
    const ipad = new IpadSimulator("existing-ipad", true, command);
    await ipad.boot();
    await ipad.shutdown();
    expect(command.mock.calls).toEqual([["simctl", ["bootstatus", "existing-ipad", "-b"]]]);
  });

  it("sets actual orientation on the selected device with a bounded command", async () => {
    const command = vi.fn(async () => {});
    const ipad = new IpadSimulator("chosen-ipad", true, command);
    await ipad.orient("portrait");
    await ipad.orient("landscapeLeft");
    expect(command.mock.calls).toEqual([
      [
        "devicectl",
        ["device", "orientation", "set", "--device", "chosen-ipad", "portrait", "--timeout", "30"],
      ],
      [
        "devicectl",
        [
          "device",
          "orientation",
          "set",
          "--device",
          "chosen-ipad",
          "landscapeLeft",
          "--timeout",
          "30",
        ],
      ],
    ]);
  });
});
