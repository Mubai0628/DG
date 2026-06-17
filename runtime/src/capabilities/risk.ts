import { type CapabilityRiskLevel } from "./types.js";

const riskOrder: readonly CapabilityRiskLevel[] = [
  "A0_observe",
  "A1_read",
  "A2_draft_write",
  "A3_scoped_write",
  "A4_external_effect",
  "A5_sensitive_or_irreversible"
];

export function compareCapabilityRisk(
  left: CapabilityRiskLevel,
  right: CapabilityRiskLevel
): number {
  return riskOrder.indexOf(left) - riskOrder.indexOf(right);
}

export function isCapabilityRiskAtMost(
  value: CapabilityRiskLevel,
  max: CapabilityRiskLevel
): boolean {
  return compareCapabilityRisk(value, max) <= 0;
}

export function isHighRiskCapability(riskLevel: CapabilityRiskLevel): boolean {
  return (
    riskLevel === "A4_external_effect" ||
    riskLevel === "A5_sensitive_or_irreversible"
  );
}
