#!/usr/bin/env node
import {
  parseEvalArgs,
  printEvalSummary,
  runWebTableToCsvEval
} from "../evals/web-table-to-csv/eval-runner.mjs";

async function main(argv) {
  const options = parseEvalArgs(argv);
  const result = await runWebTableToCsvEval(options);
  printEvalSummary(result);
  return result.ok ? 0 : 1;
}

main(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(
      `Web table to CSV eval failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
    process.exitCode = 1;
  });
