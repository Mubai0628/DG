import { type ToolRiskLevel } from "./types.js";

const riskOrder: Record<ToolRiskLevel, number> = {
  A0_observe: 0,
  A1_read: 1,
  A2_draft_write: 2,
  A3_scoped_write: 3,
  A4_external_effect: 4,
  A5_sensitive_or_irreversible: 5
};

export function compareToolRisk(
  left: ToolRiskLevel,
  right: ToolRiskLevel
): number {
  return riskOrder[left] - riskOrder[right];
}

export function isRiskAtMost(
  riskLevel: ToolRiskLevel,
  maxRiskLevel: ToolRiskLevel
): boolean {
  return compareToolRisk(riskLevel, maxRiskLevel) <= 0;
}
