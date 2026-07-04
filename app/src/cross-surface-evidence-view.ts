import {
  buildCrossSurfaceEvidenceSummary,
  type CrossSurfaceEvidenceSummary,
  type CrossSurfaceEvidenceSummaryRef,
  type CrossSurfaceEvidenceWorkflowSummaryRef
} from "../../runtime/src/workflows/cross-surface-evidence-summary.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type CrossSurfaceEvidenceViewStatus =
  | "empty"
  | "summary_ready"
  | "warning"
  | "blocked";

export type CrossSurfaceEvidenceViewFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type CrossSurfaceEvidenceViewReadiness = {
  canAttachToWorkflowPreview: boolean;
  canReadProjectRawMemory: false;
  canReadMcpResourceContent: false;
  canCallMcpTool: false;
  canExecutePluginRuntime: false;
  canExecuteSkillRuntime: false;
  canTriggerDesktopObserver: false;
  canExecuteDesktopAction: false;
  canCallDeepSeek: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type CrossSurfaceEvidenceView = {
  status: CrossSurfaceEvidenceViewStatus;
  evidenceSummaryId: string;
  evidenceCount: number;
  workflowRefCount: number;
  warningCount: number;
  blockerCount: number;
  findingCount: number;
  refs: CrossSurfaceEvidenceSummaryRef[];
  workflowSummaryRefs: CrossSurfaceEvidenceWorkflowSummaryRef[];
  findings: CrossSurfaceEvidenceViewFinding[];
  hashPrefix?: string | undefined;
  readiness: CrossSurfaceEvidenceViewReadiness;
  nextAction: string;
  source: "app_cross_surface_evidence_summary";
};

export type CrossSurfaceEvidenceViewSummary = {
  status: CrossSurfaceEvidenceViewStatus;
  evidenceSummaryId: string;
  evidenceCount: number;
  workflowRefCount: number;
  warningCount: number;
  blockerCount: number;
  hashPrefix: string;
  nextAction: string;
  source: "app_cross_surface_evidence_summary";
};

export type CrossSurfaceEvidenceViewInput = {
  evidenceJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildCrossSurfaceEvidenceView(
  input: CrossSurfaceEvidenceViewInput = {}
): CrossSurfaceEvidenceView {
  const text = input.evidenceJsonText ?? "";
  if (text.trim().length === 0) {
    return fromSummary(buildCrossSurfaceEvidenceSummary(), "empty");
  }

  const parsed = parseEvidenceJson(text);
  if (!parsed.ok) {
    return {
      status: "blocked",
      evidenceSummaryId: "cross-surface-evidence-parse-blocked",
      evidenceCount: 0,
      workflowRefCount: 0,
      warningCount: 0,
      blockerCount: 1,
      findingCount: 1,
      refs: [],
      workflowSummaryRefs: [],
      findings: [
        {
          code: "INVALID_EVIDENCE_JSON",
          severity: "blocker",
          safeMessage: parsed.safeMessage
        }
      ],
      readiness: {
        canAttachToWorkflowPreview: false,
        canReadProjectRawMemory: false,
        canReadMcpResourceContent: false,
        canCallMcpTool: false,
        canExecutePluginRuntime: false,
        canExecuteSkillRuntime: false,
        canTriggerDesktopObserver: false,
        canExecuteDesktopAction: false,
        canCallDeepSeek: false,
        canWriteEventStore: false,
        canApplyPatch: false,
        canRollback: false,
        canExecuteGit: false,
        canExecuteShell: false,
        appCanExecute: false
      },
      nextAction:
        "Paste valid summary-only evidence refs JSON without raw fields.",
      source: "app_cross_surface_evidence_summary"
    };
  }

  const summary = buildCrossSurfaceEvidenceSummary({
    evidenceRefs: Array.isArray(parsed.value)
      ? parsed.value
      : Array.isArray(parsed.value.evidenceRefs)
        ? parsed.value.evidenceRefs
        : [],
    sourceKind:
      input.sourceKind === "paste"
        ? "app_paste"
        : (input.sourceKind ?? "app_paste"),
    createdAt: input.createdAt,
    idGenerator: input.idGenerator
  });
  return fromSummary(summary);
}

export function summarizeCrossSurfaceEvidenceView(
  view: CrossSurfaceEvidenceView
): CrossSurfaceEvidenceViewSummary {
  return {
    status: view.status,
    evidenceSummaryId: view.evidenceSummaryId,
    evidenceCount: view.evidenceCount,
    workflowRefCount: view.workflowRefCount,
    warningCount: view.warningCount,
    blockerCount: view.blockerCount,
    hashPrefix: view.hashPrefix ?? "n/a",
    nextAction: view.nextAction,
    source: "app_cross_surface_evidence_summary"
  };
}

function fromSummary(
  summary: CrossSurfaceEvidenceSummary,
  forcedStatus?: CrossSurfaceEvidenceViewStatus
): CrossSurfaceEvidenceView {
  return {
    status: forcedStatus ?? summary.status,
    evidenceSummaryId: summary.evidenceSummaryId,
    evidenceCount: summary.evidenceCount,
    workflowRefCount: summary.workflowSummaryRefs.length,
    warningCount: summary.warningCount,
    blockerCount: summary.blockerCount,
    findingCount: summary.findingCount,
    refs: summary.refs,
    workflowSummaryRefs: summary.workflowSummaryRefs,
    findings: summary.findings.map((finding) => ({
      code: safeCode(finding.code),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    hashPrefix: summary.evidenceHash.slice(0, 16),
    readiness: {
      canAttachToWorkflowPreview: summary.readiness.canAttachToWorkflowPreview,
      canReadProjectRawMemory: false,
      canReadMcpResourceContent: false,
      canCallMcpTool: false,
      canExecutePluginRuntime: false,
      canExecuteSkillRuntime: false,
      canTriggerDesktopObserver: false,
      canExecuteDesktopAction: false,
      canCallDeepSeek: false,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: summary.nextAction,
    source: "app_cross_surface_evidence_summary"
  };
}

function parseEvidenceJson(
  text: string
):
  | { ok: true; value: Record<string, unknown> | Record<string, unknown>[] }
  | { ok: false; safeMessage: string } {
  try {
    const value = JSON.parse(text) as unknown;
    if (Array.isArray(value) || (value !== null && typeof value === "object")) {
      return {
        ok: true,
        value: value as Record<string, unknown> | Record<string, unknown>[]
      };
    }
    return {
      ok: false,
      safeMessage: "Evidence JSON must be an object or array."
    };
  } catch (caught) {
    return { ok: false, safeMessage: safeErrorMessage(caught) };
  }
}

function safeCode(value: string): string {
  return safeErrorMessage(safeText(value, "")).replace(/[^A-Z0-9_.-]/gi, "_");
}
