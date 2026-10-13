/** Joined saved-data comparison from brush constructor inputs through corrected path. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { replayPostCapture } from "../post-pipeline/replay.ts";
import { replayJoinedSourceCapture } from "./source-replay.ts";
import { replayJoinedUpstreamCapture } from "./upstream-replay.ts";

type IncompleteStage = { status: "incomplete"; error: string };
function incomplete(error: unknown): IncompleteStage {
  return { status: "incomplete", error: error instanceof Error ? error.message : String(error) };
}

export function replayJoinedCapture(text: string) {
  const upstream = replayJoinedUpstreamCapture(text);
  let source: ReturnType<typeof replayJoinedSourceCapture>["source"] | IncompleteStage;
  let post: ReturnType<typeof replayJoinedSourceCapture>["post"] | IncompleteStage;
  try {
    const joined = replayJoinedSourceCapture(text);
    source = joined.source;
    post = joined.post;
  } catch (error) {
    source = incomplete(error);
    // The saved post boundary remains useful when upstream/source inputs are absent.
    try {
      post = replayPostCapture(text);
    } catch (postError) {
      post = incomplete(postError);
    }
  }
  const statuses = [upstream.status, source.status, post.status];
  const status = statuses.every((value) => value === "match")
    ? "match"
    : statuses.some((value) => value === "incomplete" || value === "failed")
      ? "incomplete"
      : "mismatch";
  return {
    schema: "csp-joined-post-replay/v1",
    inputSha256: createHash("sha256").update(text).digest("hex"),
    provenance: upstream.provenance,
    status,
    scope:
      "Observed primary brush constructor inputs → constructed records → quadratic source → corrected path, using independently observed resolved evaluator configuration. Evaluator cache/copy selection, browser acquisition, native event generation and rendered pixels are not evaluated.",
    upstream,
    source,
    post,
    wholeFeatureEquivalence: "not-established",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath)
    throw new Error("Usage: replay.ts joined-capture.jsonl new-report.json");
  const report = replayJoinedCapture(readFileSync(inputPath, "utf8"));
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(
    JSON.stringify({
      status: report.status,
      provenance: report.provenance,
      upstream: report.upstream.status,
      source: report.source.status,
      post: report.post.status,
    }),
  );
  if (report.status !== "match") process.exitCode = 1;
}
