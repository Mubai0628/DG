import {
  buildCapabilityPolicyEnforcementReport,
  type CapabilityPolicyEnforcementInput,
  type CapabilityPolicyEnforcementReport,
  type CapabilityPolicyItemInput
} from "../../runtime/src/workflows/capability-policy-enforcement.js";
import { safeErrorMessage } from "./safety.js";

export type CapabilityPolicyEnforcementViewStatus =
  | "empty"
  | "policy_ready"
  | "warning"
  | "blocked";

export type CapabilityPolicyEnforcementView = {
  status: CapabilityPolicyEnforcementViewStatus;
  policyId: string;
  capabilityCount: number;
  allowedCount: number;
  blockedCount: number;
  warningCount: number;
  blockerCount: number;
  findingCount: number;
  categoryCounts: CapabilityPolicyEnforcementReport["categoryCounts"];
  riskCounts: CapabilityPolicyEnforcementReport["riskCounts"];
  itemSummaries: CapabilityPolicyEnforcementReport["itemSummaries"];
  findingCodes: string[];
  hashPrefix?: string | undefined;
  readiness: CapabilityPolicyEnforcementReport["readiness"];
  nextAction: string;
  source: "app_capability_policy_enforcement_view";
};

export type CapabilityPolicyEnforcementViewSummary = {
  status: CapabilityPolicyEnforcementViewStatus;
  policyId: string;
  capabilityCount: number;
  allowedCount: number;
  blockedCount: number;
  warningCount: number;
  hashPrefix: string;
  nextAction: string;
  source: "app_capability_policy_enforcement_view";
};

export type CapabilityPolicyEnforcementViewInput = {
  policyJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildCapabilityPolicyEnforcementView(
  input: CapabilityPolicyEnforcementViewInput = {}
): CapabilityPolicyEnforcementView {
  const text = input.policyJsonText ?? "";
  if (text.trim().length === 0) {
    return fromReport(buildCapabilityPolicyEnforcementReport(), "empty");
  }
  const parsed = parsePolicyJson(text);
  if (!parsed.ok) {
    return {
      ...fromReport(buildCapabilityPolicyEnforcementReport(), "blocked"),
      policyId: "capability-policy-parse-blocked",
      blockerCount: 1,
      findingCount: 1,
      findingCodes: ["INVALID_CAPABILITY_POLICY_JSON"],
      nextAction: parsed.safeMessage
    };
  }
  const value = parsed.value;
  const report = buildCapabilityPolicyEnforcementReport({
    capabilities: Array.isArray(value)
      ? value
      : Array.isArray(value.capabilities)
        ? value.capabilities
        : [],
    ...(!Array.isArray(value) && value.riskPolicy !== undefined
      ? { riskPolicy: value.riskPolicy }
      : {}),
    sourceKind:
      input.sourceKind === "paste"
        ? "app_preview"
        : (input.sourceKind ?? "app_preview"),
    idGenerator: input.idGenerator
  });
  return fromReport(report);
}

export function summarizeCapabilityPolicyEnforcementView(
  view: CapabilityPolicyEnforcementView
): CapabilityPolicyEnforcementViewSummary {
  return {
    status: view.status,
    policyId: view.policyId,
    capabilityCount: view.capabilityCount,
    allowedCount: view.allowedCount,
    blockedCount: view.blockedCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix ?? "n/a",
    nextAction: view.nextAction,
    source: "app_capability_policy_enforcement_view"
  };
}

function fromReport(
  report: CapabilityPolicyEnforcementReport,
  forcedStatus?: CapabilityPolicyEnforcementViewStatus
): CapabilityPolicyEnforcementView {
  return {
    status: forcedStatus ?? report.status,
    policyId: report.policyId,
    capabilityCount: report.capabilityCount,
    allowedCount: report.allowedCount,
    blockedCount: report.blockedCount,
    warningCount: report.warningCount,
    blockerCount: report.blockerCount,
    findingCount: report.findingCount,
    categoryCounts: report.categoryCounts,
    riskCounts: report.riskCounts,
    itemSummaries: report.itemSummaries,
    findingCodes: report.findings.map((finding) => finding.code),
    hashPrefix: report.enforcementHash.slice(0, 16),
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: "app_capability_policy_enforcement_view"
  };
}

function parsePolicyJson(
  text: string
):
  | {
      ok: true;
      value:
        | { capabilities?: CapabilityPolicyItemInput[]; riskPolicy?: CapabilityPolicyEnforcementInput["riskPolicy"] }
        | CapabilityPolicyItemInput[];
    }
  | { ok: false; safeMessage: string } {
  try {
    const value = JSON.parse(text) as unknown;
    if (Array.isArray(value) || (value !== null && typeof value === "object")) {
      return {
        ok: true,
        value: value as
          | {
              capabilities?: CapabilityPolicyItemInput[];
              riskPolicy?: CapabilityPolicyEnforcementInput["riskPolicy"];
            }
          | CapabilityPolicyItemInput[]
      };
    }
    return {
      ok: false,
      safeMessage: "Capability policy JSON must be an object or array."
    };
  } catch (caught) {
    return { ok: false, safeMessage: safeErrorMessage(caught) };
  }
}
