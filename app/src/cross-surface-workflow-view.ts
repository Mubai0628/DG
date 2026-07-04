import {
  buildCrossSurfaceWorkflowPlan,
  summarizeCrossSurfaceWorkflowPlan,
  type CrossSurfaceWorkflowPlan,
  type CrossSurfaceWorkflowPlanStepKind,
  type CrossSurfaceWorkflowPlanStepStatus
} from "../../runtime/src/workflows/cross-surface-workflow-planner.js";
import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import {
  validateCrossSurfaceWorkflowScenario,
  type CrossSurfaceScenarioValidationResult
} from "../../runtime/src/models/cross-surface-workflow-scenario.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type CrossSurfaceWorkflowViewStatus =
  | "empty"
  | "preview_ready"
  | "warning"
  | "blocked";

export type CrossSurfaceWorkflowViewFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type CrossSurfaceWorkflowViewStage = {
  kind: CrossSurfaceWorkflowPlanStepKind;
  status: CrossSurfaceWorkflowPlanStepStatus;
  stageId?: string | undefined;
  refId?: string | undefined;
  stateAfter: string;
  warningCodes: string[];
  blockerCodes: string[];
};

export type CrossSurfaceWorkflowViewReadiness = {
  canPreviewWorkflow: boolean;
  canRunWorkflow: false;
  canRunAgents: false;
  canCallDeepSeek: false;
  canInvokeMcpTools: false;
  canInvokePluginRuntime: false;
  canInvokeSkillRuntime: false;
  canExecuteDesktopAction: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteEventStore: false;
  canExecuteGit: false;
  canExecuteShell: false;
  canIssuePermissionLease: false;
  canUseNativeBridge: false;
  appCanExecute: false;
};

export type CrossSurfaceWorkflowViewSummary = {
  status: CrossSurfaceWorkflowViewStatus;
  viewId: string;
  scenarioId: string;
  planId: string;
  stepCount: number;
  readyStepCount: number;
  missingStepCount: number;
  blockerCount: number;
  warningCount: number;
  hashPrefix: string;
  nextAction: string;
  source: "app_cross_surface_workflow_preview";
};

export type CrossSurfaceWorkflowView = {
  status: CrossSurfaceWorkflowViewStatus;
  viewId: string;
  sourceKind: "paste" | "fixture" | "manual_test";
  scenarioId?: string | undefined;
  planId?: string | undefined;
  planStatus?: CrossSurfaceWorkflowPlan["status"] | undefined;
  state?: CrossSurfaceWorkflowPlan["state"] | undefined;
  stepCount: number;
  readyStepCount: number;
  missingStepCount: number;
  blockedStepCount: number;
  warningStepCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  stages: CrossSurfaceWorkflowViewStage[];
  findings: CrossSurfaceWorkflowViewFinding[];
  hashPrefix?: string | undefined;
  readiness: CrossSurfaceWorkflowViewReadiness;
  nextAction: string;
  source: "app_cross_surface_workflow_preview";
};

export type CrossSurfaceWorkflowViewInput = {
  scenarioJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const emptyReadiness: CrossSurfaceWorkflowViewReadiness = {
  canPreviewWorkflow: false,
  canRunWorkflow: false,
  canRunAgents: false,
  canCallDeepSeek: false,
  canInvokeMcpTools: false,
  canInvokePluginRuntime: false,
  canInvokeSkillRuntime: false,
  canExecuteDesktopAction: false,
  canApplyPatch: false,
  canRollback: false,
  canWriteEventStore: false,
  canExecuteGit: false,
  canExecuteShell: false,
  canIssuePermissionLease: false,
  canUseNativeBridge: false,
  appCanExecute: false
};

export function buildCrossSurfaceWorkflowView(
  input: CrossSurfaceWorkflowViewInput = {}
): CrossSurfaceWorkflowView {
  const text = input.scenarioJsonText ?? "";
  if (text.trim().length === 0) {
    return emptyView(input);
  }

  const scenarioResult = validateCrossSurfaceWorkflowScenario(text, {
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  const plan = buildCrossSurfaceWorkflowPlan({
    scenario: scenarioResult,
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  const status = statusFrom(scenarioResult, plan);
  const hashPrefix = plan.planHash.slice(0, 16);

  return {
    status,
    viewId: `cross-surface-workflow-view-${hashPrefix}`,
    sourceKind: input.sourceKind ?? "paste",
    scenarioId: scenarioResult.summary.scenarioId,
    planId: plan.planId,
    planStatus: plan.status,
    state: plan.state,
    stepCount: plan.stepCount,
    readyStepCount: plan.readyStepCount,
    missingStepCount: plan.missingStepCount,
    blockedStepCount: plan.blockedStepCount,
    warningStepCount: plan.warningStepCount,
    blockerCount: plan.blockerCount,
    warningCount: plan.warningCount,
    findingCount: plan.findingCount,
    stages: plan.steps.map((step) => ({
      kind: step.kind,
      status: step.status,
      stageId: safeOptional(step.stageId),
      refId: safeOptional(step.refId),
      stateAfter: step.stateAfter,
      warningCodes: step.warningCodes.map(safeCode),
      blockerCodes: step.blockerCodes.map(safeCode)
    })),
    findings: safeFindings(plan, scenarioResult),
    hashPrefix,
    readiness: {
      ...emptyReadiness,
      canPreviewWorkflow: status !== "blocked" && status !== "empty"
    },
    nextAction: nextActionFor(status),
    source: "app_cross_surface_workflow_preview"
  };
}

export function summarizeCrossSurfaceWorkflowView(
  view: CrossSurfaceWorkflowView
): CrossSurfaceWorkflowViewSummary {
  return {
    status: view.status,
    viewId: view.viewId,
    scenarioId: view.scenarioId ?? "n/a",
    planId: view.planId ?? "n/a",
    stepCount: view.stepCount,
    readyStepCount: view.readyStepCount,
    missingStepCount: view.missingStepCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix ?? "n/a",
    nextAction: view.nextAction,
    source: view.source
  };
}

function emptyView(
  input: CrossSurfaceWorkflowViewInput
): CrossSurfaceWorkflowView {
  const sourceKind = input.sourceKind ?? "paste";
  const seed = stablePreviewHash(
    stableStringify({
      sourceKind,
      createdAt: input.createdAt ?? "not_provided"
    })
  ).slice(0, 16);
  return {
    status: "empty",
    viewId: `cross-surface-workflow-view-empty-${seed}`,
    sourceKind,
    stepCount: 0,
    readyStepCount: 0,
    missingStepCount: 0,
    blockedStepCount: 0,
    warningStepCount: 0,
    blockerCount: 0,
    warningCount: 0,
    findingCount: 0,
    stages: [],
    findings: [],
    readiness: emptyReadiness,
    nextAction: "Paste a summary-only cross-surface workflow scenario.",
    source: "app_cross_surface_workflow_preview"
  };
}

function statusFrom(
  scenarioResult: CrossSurfaceScenarioValidationResult,
  plan: CrossSurfaceWorkflowPlan
): CrossSurfaceWorkflowViewStatus {
  if (scenarioResult.status === "blocked" || plan.status === "blocked") {
    return "blocked";
  }
  if (plan.status === "empty") {
    return "empty";
  }
  if (
    scenarioResult.status === "warning" ||
    plan.status === "warning" ||
    plan.warningCount > 0 ||
    plan.missingStepCount > 0
  ) {
    return "warning";
  }
  return "preview_ready";
}

function safeFindings(
  plan: CrossSurfaceWorkflowPlan,
  scenarioResult: CrossSurfaceScenarioValidationResult
): CrossSurfaceWorkflowViewFinding[] {
  const combined = [...scenarioResult.findings, ...plan.findings];
  const seen = new Set<string>();
  const findings: CrossSurfaceWorkflowViewFinding[] = [];
  for (const finding of combined) {
    const code = safeCode(finding.code);
    const key = `${finding.severity}:${code}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    findings.push({
      code,
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    });
  }
  return findings;
}

function nextActionFor(status: CrossSurfaceWorkflowViewStatus): string {
  if (status === "empty") {
    return "Paste a summary-only cross-surface workflow scenario.";
  }
  if (status === "blocked") {
    return "Reject this workflow preview until raw-field, secret, path, and execution blockers are removed.";
  }
  if (status === "warning") {
    return "Review missing or warning stages. The App Shell still cannot execute the workflow.";
  }
  return "Review the cross-surface workflow preview. Execution remains disabled in the App Shell.";
}

function safeOptional(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return safeErrorMessage(safeText(value, "")).slice(0, 120);
}

function safeCode(value: string): string {
  return safeErrorMessage(value).replace(/[^A-Z0-9_.-]/gi, "_").slice(0, 80);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
