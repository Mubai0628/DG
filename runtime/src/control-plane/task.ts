import { ControlPlaneException, controlPlaneError } from "./errors.js";
import {
  createControlHash,
  safeControlSummary,
  validateNoUnsafeControlText,
  warning
} from "./summaries.js";
import {
  type ControlPlaneTask,
  type ControlPlaneTaskInput,
  type ControlPlaneTaskIntent
} from "./types.js";

const intents: readonly ControlPlaneTaskIntent[] = [
  "web_data_extraction",
  "code_change",
  "code_review",
  "verification",
  "documentation",
  "bridge_payload_preview",
  "unknown"
];

export function createControlPlaneTask(
  input: ControlPlaneTaskInput,
  options: {
    taskIdFactory?: () => string;
    clock?: () => Date;
  } = {}
): ControlPlaneTask {
  const taskId = input.taskId ?? options.taskIdFactory?.() ?? "control-task-1";
  const createdAt =
    input.createdAt ?? (options.clock?.() ?? new Date()).toISOString();
  const unsafeErrors = validateNoUnsafeControlText(input.objective, { taskId });
  if (unsafeErrors.length > 0) {
    throw new ControlPlaneException(unsafeErrors[0]!);
  }

  const intent = normalizeTaskIntent(input.intent);
  const warnings =
    intent === "unknown"
      ? [
          warning(
            "unknown_intent",
            "Unknown task intent requires clarification before planning."
          )
        ]
      : [];
  const taskWithoutHash = {
    taskId,
    intent,
    objective: input.objective,
    objectiveSummary: safeControlSummary(input.objective),
    createdAt,
    status: intent === "unknown" ? "needs_clarification" : "created",
    warnings
  } satisfies Omit<ControlPlaneTask, "hash">;

  return {
    ...taskWithoutHash,
    hash: createControlHash(taskWithoutHash)
  };
}

export function validateControlPlaneTask(task: ControlPlaneTask): {
  ok: boolean;
  errors: ReturnType<typeof controlPlaneError>[];
} {
  const errors = [
    ...validateNoUnsafeControlText(task.objective, { taskId: task.taskId })
  ];
  if (task.taskId.length === 0 || task.objective.length === 0) {
    errors.push(
      controlPlaneError(
        "invalid_task",
        "missing_required_field",
        "Control-plane task is missing a required field.",
        { taskId: task.taskId }
      )
    );
  }
  if (!intents.includes(task.intent)) {
    errors.push(
      controlPlaneError(
        "invalid_task",
        "unknown_intent",
        "Control-plane task has an unknown intent.",
        { taskId: task.taskId }
      )
    );
  }
  return { ok: errors.length === 0, errors };
}

export function summarizeControlPlaneTask(
  task: ControlPlaneTask
): Record<string, unknown> {
  return {
    taskId: task.taskId,
    intent: task.intent,
    status: task.status,
    objectiveSummary: task.objectiveSummary,
    warningCodes: task.warnings.map((item) => item.code),
    hash: task.hash
  };
}

function normalizeTaskIntent(value: string): ControlPlaneTaskIntent {
  return intents.includes(value as ControlPlaneTaskIntent)
    ? (value as ControlPlaneTaskIntent)
    : "unknown";
}
