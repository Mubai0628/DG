import { shellIssue } from "./errors.js";
import {
  summarizeShellOutput,
  summarizeShellOutputForEvent
} from "./output-summarizer.js";
import {
  type FakeShellRunnerFixtures,
  type ShellAllowlistOptions,
  type ShellCommandPlan,
  type ShellFakeRunResult,
  type ShellRunner
} from "./types.js";

export class FakeShellRunner implements ShellRunner {
  constructor(
    private readonly fixtures: FakeShellRunnerFixtures,
    private readonly options: ShellAllowlistOptions = {}
  ) {}

  run(plan: ShellCommandPlan): ShellFakeRunResult {
    if (plan.status !== "planned") {
      return {
        ok: false,
        plan,
        errors: [
          shellIssue(
            "unknown_command",
            "FakeShellRunner only accepts planned shell command plans.",
            { commandId: plan.commandId }
          )
        ]
      };
    }

    const fixture = this.fixtures[plan.commandId];
    if (fixture === undefined) {
      return {
        ok: false,
        plan,
        errors: [
          shellIssue("missing_fixture", "Fake shell fixture is missing.", {
            commandId: plan.commandId
          })
        ]
      };
    }

    const summary = summarizeShellOutput(fixture, plan.outputPolicy);
    this.options.eventStore?.appendEvent({
      type: "shell.command.simulated",
      payload: {
        commandId: plan.commandId,
        templateId: plan.templateId,
        argvFingerprint: plan.hash.slice(0, 16),
        category: plan.category,
        planStatus: plan.status,
        warningCodes: plan.warnings.map((warning) => warning.code),
        ...summarizeShellOutputForEvent(summary)
      }
    });
    this.options.eventStore?.appendEvent({
      type: "shell.output.summarized",
      payload: {
        commandId: plan.commandId,
        templateId: plan.templateId,
        argvFingerprint: plan.hash.slice(0, 16),
        ...summarizeShellOutputForEvent(summary)
      }
    });

    return {
      ok: true,
      plan,
      summary
    };
  }
}

export function createFakeShellRunner(
  fixtures: FakeShellRunnerFixtures,
  options: ShellAllowlistOptions = {}
): FakeShellRunner {
  return new FakeShellRunner(fixtures, options);
}
