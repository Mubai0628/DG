import {
  buildEvidenceFreshnessDriftReport,
  type EvidenceFreshnessDriftInput,
  type EvidenceFreshnessDriftReport,
  type EvidenceFreshnessRefInput
} from "../../runtime/src/workflows/evidence-freshness-drift.js";
import { safeErrorMessage } from "./safety.js";

export type EvidenceFreshnessDriftViewStatus =
  | "empty"
  | "fresh"
  | "warning"
  | "blocked";

export type EvidenceFreshnessDriftView = {
  status: EvidenceFreshnessDriftViewStatus;
  freshnessId: string;
  evidenceCount: number;
  staleCount: number;
  driftCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  categoryCounts: EvidenceFreshnessDriftReport["categoryCounts"];
  refs: EvidenceFreshnessDriftReport["refs"];
  findingCodes: string[];
  hashPrefix?: string | undefined;
  readiness: EvidenceFreshnessDriftReport["readiness"];
  nextAction: string;
  source: "app_evidence_freshness_drift_view";
};

export type EvidenceFreshnessDriftViewSummary = {
  status: EvidenceFreshnessDriftViewStatus;
  freshnessId: string;
  evidenceCount: number;
  staleCount: number;
  driftCount: number;
  blockerCount: number;
  warningCount: number;
  hashPrefix: string;
  nextAction: string;
  source: "app_evidence_freshness_drift_view";
};

export type EvidenceFreshnessDriftViewInput = {
  freshnessJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildEvidenceFreshnessDriftView(
  input: EvidenceFreshnessDriftViewInput = {}
): EvidenceFreshnessDriftView {
  const text = input.freshnessJsonText ?? "";
  if (text.trim().length === 0) {
    return fromReport(buildEvidenceFreshnessDriftReport(), "empty");
  }
  const parsed = parseFreshnessJson(text);
  if (!parsed.ok) {
    return {
      ...fromReport(buildEvidenceFreshnessDriftReport(), "blocked"),
      freshnessId: "evidence-freshness-parse-blocked",
      blockerCount: 1,
      findingCount: 1,
      findingCodes: ["INVALID_EVIDENCE_FRESHNESS_JSON"],
      nextAction: parsed.safeMessage
    };
  }
  const value = parsed.value;
  const report = buildEvidenceFreshnessDriftReport({
    evidenceRefs: Array.isArray(value)
      ? value
      : Array.isArray(value.evidenceRefs)
        ? value.evidenceRefs
        : [],
    ...numberOption(value, "staleThresholdMs"),
    ...numberOption(value, "desktopObservationStaleThresholdMs"),
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

export function summarizeEvidenceFreshnessDriftView(
  view: EvidenceFreshnessDriftView
): EvidenceFreshnessDriftViewSummary {
  return {
    status: view.status,
    freshnessId: view.freshnessId,
    evidenceCount: view.evidenceCount,
    staleCount: view.staleCount,
    driftCount: view.driftCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix ?? "n/a",
    nextAction: view.nextAction,
    source: "app_evidence_freshness_drift_view"
  };
}

function fromReport(
  report: EvidenceFreshnessDriftReport,
  forcedStatus?: EvidenceFreshnessDriftViewStatus
): EvidenceFreshnessDriftView {
  return {
    status: forcedStatus ?? report.status,
    freshnessId: report.freshnessId,
    evidenceCount: report.evidenceCount,
    staleCount: report.staleCount,
    driftCount: report.driftCount,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    findingCount: report.findingCount,
    categoryCounts: report.categoryCounts,
    refs: report.refs,
    findingCodes: report.findings.map((finding) => finding.code),
    hashPrefix: report.freshnessHash.slice(0, 16),
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: "app_evidence_freshness_drift_view"
  };
}

function numberOption(
  value: Record<string, unknown> | EvidenceFreshnessRefInput[],
  key: "staleThresholdMs" | "desktopObservationStaleThresholdMs"
): Partial<EvidenceFreshnessDriftInput> {
  if (Array.isArray(value) || typeof value[key] !== "number") {
    return {};
  }
  return { [key]: value[key] };
}

function parseFreshnessJson(
  text: string
):
  | {
      ok: true;
      value:
        | (Record<string, unknown> & { evidenceRefs?: EvidenceFreshnessRefInput[] })
        | EvidenceFreshnessRefInput[];
    }
  | { ok: false; safeMessage: string } {
  try {
    const value = JSON.parse(text) as unknown;
    if (Array.isArray(value) || (value !== null && typeof value === "object")) {
      return {
        ok: true,
        value: value as
          | (Record<string, unknown> & {
              evidenceRefs?: EvidenceFreshnessRefInput[];
            })
          | EvidenceFreshnessRefInput[]
      };
    }
    return {
      ok: false,
      safeMessage: "Evidence freshness JSON must be an object or array."
    };
  } catch (caught) {
    return { ok: false, safeMessage: safeErrorMessage(caught) };
  }
}
