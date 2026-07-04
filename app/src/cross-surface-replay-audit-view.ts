import {
  buildReplayAuditCompletenessReport,
  type ReplayAuditCompletenessInput,
  type ReplayAuditCompletenessReport,
  type ReplayAuditEventInput
} from "../../runtime/src/workflows/replay-audit-completeness.js";
import { safeErrorMessage } from "./safety.js";

export type CrossSurfaceReplayAuditViewStatus =
  | "empty"
  | "complete"
  | "warning"
  | "blocked";

export type CrossSurfaceReplayAuditView = {
  status: CrossSurfaceReplayAuditViewStatus;
  completenessId: string;
  eventCount: number;
  requiredEventCount: number;
  presentRequiredEventCount: number;
  missingRequiredEventCount: number;
  outOfOrderCount: number;
  duplicateConflictCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  eventSummaries: ReplayAuditCompletenessReport["eventSummaries"];
  missingRequiredKinds: ReplayAuditCompletenessReport["missingRequiredKinds"];
  findingCodes: string[];
  hashPrefix?: string | undefined;
  readiness: ReplayAuditCompletenessReport["readiness"];
  nextAction: string;
  source: "app_cross_surface_replay_audit_completeness";
};

export type CrossSurfaceReplayAuditViewSummary = {
  status: CrossSurfaceReplayAuditViewStatus;
  completenessId: string;
  eventCount: number;
  missingRequiredEventCount: number;
  blockerCount: number;
  warningCount: number;
  hashPrefix: string;
  nextAction: string;
  source: "app_cross_surface_replay_audit_completeness";
};

export type CrossSurfaceReplayAuditViewInput = {
  replayAuditJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildCrossSurfaceReplayAuditView(
  input: CrossSurfaceReplayAuditViewInput = {}
): CrossSurfaceReplayAuditView {
  const text = input.replayAuditJsonText ?? "";
  if (text.trim().length === 0) {
    return fromReport(buildReplayAuditCompletenessReport(), "empty");
  }
  const parsed = parseReplayAuditJson(text);
  if (!parsed.ok) {
    return {
      ...fromReport(buildReplayAuditCompletenessReport(), "blocked"),
      completenessId: "replay-audit-parse-blocked",
      blockerCount: 1,
      findingCount: 1,
      findingCodes: ["INVALID_REPLAY_AUDIT_JSON"],
      nextAction: parsed.safeMessage
    };
  }
  const value = parsed.value;
  const report = buildReplayAuditCompletenessReport({
    events: Array.isArray(value)
      ? value
      : Array.isArray(value.events)
        ? value.events
        : [],
    ...(!Array.isArray(value) && Array.isArray(value.requiredKinds)
      ? { requiredKinds: value.requiredKinds }
      : {}),
    ...booleanOption(value, "rollbackOccurred"),
    ...booleanOption(value, "mcpReferenced"),
    ...booleanOption(value, "pluginSkillReferenced"),
    ...booleanOption(value, "desktopActionReferenced"),
    ...booleanOption(value, "desktopActionOccurred"),
    sourceKind:
      input.sourceKind === "paste"
        ? "app_preview"
        : (input.sourceKind ?? "app_preview"),
    createdAt:
      input.createdAt ??
      (!Array.isArray(value) && typeof value.createdAt === "string"
        ? value.createdAt
        : undefined),
    idGenerator: input.idGenerator
  });
  return fromReport(report);
}

export function summarizeCrossSurfaceReplayAuditView(
  view: CrossSurfaceReplayAuditView
): CrossSurfaceReplayAuditViewSummary {
  return {
    status: view.status,
    completenessId: view.completenessId,
    eventCount: view.eventCount,
    missingRequiredEventCount: view.missingRequiredEventCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix ?? "n/a",
    nextAction: view.nextAction,
    source: "app_cross_surface_replay_audit_completeness"
  };
}

function fromReport(
  report: ReplayAuditCompletenessReport,
  forcedStatus?: CrossSurfaceReplayAuditViewStatus
): CrossSurfaceReplayAuditView {
  return {
    status: forcedStatus ?? report.status,
    completenessId: report.completenessId,
    eventCount: report.eventCount,
    requiredEventCount: report.requiredEventCount,
    presentRequiredEventCount: report.presentRequiredEventCount,
    missingRequiredEventCount: report.missingRequiredEventCount,
    outOfOrderCount: report.outOfOrderCount,
    duplicateConflictCount: report.duplicateConflictCount,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    findingCount: report.findingCount,
    eventSummaries: report.eventSummaries,
    missingRequiredKinds: report.missingRequiredKinds,
    findingCodes: report.findings.map((finding) => finding.code),
    hashPrefix: report.completenessHash.slice(0, 16),
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: "app_cross_surface_replay_audit_completeness"
  };
}

function booleanOption(
  value: Record<string, unknown> | ReplayAuditEventInput[],
  key: keyof ReplayAuditCompletenessInput
): Partial<ReplayAuditCompletenessInput> {
  if (Array.isArray(value) || typeof value[key] !== "boolean") {
    return {};
  }
  return { [key]: value[key] } as Partial<ReplayAuditCompletenessInput>;
}

function parseReplayAuditJson(text: string):
  | {
      ok: true;
      value:
        | (Record<string, unknown> & {
            events?: ReplayAuditEventInput[];
            requiredKinds?: ReplayAuditCompletenessInput["requiredKinds"];
          })
        | ReplayAuditEventInput[];
    }
  | { ok: false; safeMessage: string } {
  try {
    const value = JSON.parse(text) as unknown;
    if (Array.isArray(value) || (value !== null && typeof value === "object")) {
      return {
        ok: true,
        value: value as
          | (Record<string, unknown> & {
              events?: ReplayAuditEventInput[];
              requiredKinds?: ReplayAuditCompletenessInput["requiredKinds"];
            })
          | ReplayAuditEventInput[]
      };
    }
    return {
      ok: false,
      safeMessage: "Replay/audit JSON must be an object or array."
    };
  } catch (caught) {
    return { ok: false, safeMessage: safeErrorMessage(caught) };
  }
}
