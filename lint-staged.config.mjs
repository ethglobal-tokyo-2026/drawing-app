// lint-staged runs without a shell; quote file paths for its argument parser.
/** @param {string[]} files */
const argumentsOf = (files) =>
  files.map((file) => `"${file.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`).join(" ");

/** @param {string} file */
const isResearch = (file) => file.replaceAll("\\", "/").includes("/docs/research/");

/** @param {string[]} files */
function codeChecks(files) {
  const research = files.filter(isResearch);
  const production = files.filter((file) => !isResearch(file));
  /** @type {string[]} */
  const commands = [];
  if (production.length) {
    const argumentsText = argumentsOf(production);
    commands.push(
      `oxlint --type-check --fix ${argumentsText}`,
      `oxlint --type-check ${argumentsText}`,
    );
  }
  if (research.length) {
    // Historical probes use saved interfaces and untyped captures, outside the app's TypeScript build.
    const argumentsText = argumentsOf(research);
    commands.push(
      `oxlint -c oxlint.research.json --no-error-on-unmatched-pattern --fix ${argumentsText}`,
      `oxlint -c oxlint.research.json --no-error-on-unmatched-pattern ${argumentsText}`,
    );
  }
  commands.push(`oxfmt --no-error-on-unmatched-pattern ${argumentsOf(files)}`);
  return commands;
}

export default {
  "*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}": codeChecks,
  "!(*.{js,jsx,mjs,cjs,ts,tsx,mts,cts})": "oxfmt --no-error-on-unmatched-pattern",
};
