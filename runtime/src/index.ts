export const projectName = "deepseek-workbench";
export const releaseScope = "v0.1.0";
export const currentTaskId = "DW-P0A-001";
export const nextTaskId = "DW-P0A-002";

export type RuntimeSkeletonStatus = {
  projectName: typeof projectName;
  releaseScope: typeof releaseScope;
  currentTaskId: typeof currentTaskId;
  nextTaskId: typeof nextTaskId;
  implementedCapabilities: string[];
  disabledUntilLaterTasks: string[];
};

export function getRuntimeSkeletonStatus(): RuntimeSkeletonStatus {
  return {
    projectName,
    releaseScope,
    currentTaskId,
    nextTaskId,
    implementedCapabilities: ["workspace skeleton", "runtime package stub"],
    disabledUntilLaterTasks: [
      "real DeepSeek API calls",
      "ConversationEngine",
      "EventStore and ReplayEngine",
      "browser extension permissions",
      "desktop control"
    ]
  };
}
