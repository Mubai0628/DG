export const projectName = "deepseek-workbench";
export const releaseScope = "v0.1.0";
export const currentTaskId = "DW-P0A-004";
export const nextTaskId = "DW-P0A-005";

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
    implementedCapabilities: [
      "workspace skeleton",
      "runtime package",
      "event store",
      "replay demo",
      "DeepSeek client adapter",
      "fake DeepSeek client",
      "ConversationEngine invariants"
    ],
    disabledUntilLaterTasks: [
      "ConversationEngine",
      "browser extension permissions",
      "desktop control"
    ]
  };
}

export * from "./conversation/index.js";
export * from "./context/index.js";
export * from "./deepseek/index.js";
export * from "./events/index.js";
export * from "./web/index.js";
export {
  ToolBroker,
  createToolCallRequestFromDeepSeekToolCall
} from "./tools/tool-broker.js";
export { ToolBrokerError } from "./tools/errors.js";
export { decideToolPermission } from "./tools/permission-policy.js";
export { compareToolRisk, isRiskAtMost } from "./tools/risk.js";
export { ToolRegistry } from "./tools/tool-registry.js";
export type {
  ToolArgumentSummary,
  ToolBrokerErrorKind,
  ToolBrokerOptions,
  ToolCallRequest,
  ToolCallResult,
  ToolCallSource,
  ToolDefinitionRuntime,
  ToolExecutionStatus,
  ToolName,
  ToolPermissionDecision,
  ToolPermissionPolicy,
  ToolRiskLevel
} from "./tools/types.js";
export * from "./workspace/index.js";
