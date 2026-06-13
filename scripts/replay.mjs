import { createDemoEvents, replay } from "../runtime/dist/index.js";

const args = process.argv.slice(2);

if (!args.includes("--demo")) {
  console.error("Usage: pnpm run replay -- --demo");
  process.exitCode = 1;
} else {
  const events = createDemoEvents();
  const state = replay(events);
  const taskSummary = Object.entries(state.tasks)
    .map(([taskId, status]) => `${taskId} ${status}`)
    .join(", ");

  console.log("Replay demo");
  console.log(`events: ${state.eventCount}`);
  console.log(`tasks: ${taskSummary}`);
  console.log(
    `usage totals: input=${state.usageTotals.inputTokens} output=${state.usageTotals.outputTokens} reasoning=${state.usageTotals.reasoningTokens} cacheHit=${state.usageTotals.cacheHitTokens} cacheMiss=${state.usageTotals.cacheMissTokens} retries=${state.usageTotals.retryCount} latencyMs=${state.usageTotals.latencyMs}`
  );
  console.log(`drafts: ${state.draftCount}`);
}
