import { type AgentDossier, type AgentIsolationViolation } from "./types.js";

const forbiddenKeys = [
  "rawPrompt",
  "rawCode",
  "rawDom",
  "rawCsv",
  "rawScreenshot",
  "clipboard",
  "apiKey",
  "authorization",
  "chainOfThought",
  "privateScratchpad"
];

const forbiddenStringPatterns = [
  /\braw prompt\b/i,
  /\braw code\b/i,
  /\braw dom\b/i,
  /\braw csv\b/i,
  /\bapi key\b/i,
  /\bAuthorization\b/,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bBearer\s+[A-Za-z0-9._-]{16,}\b/,
  /\b(powershell|cmd|bash|sh|git|node|pnpm|npm)\s+[-\w]/i
];

export function detectAgentIsolationViolations(
  value: unknown,
  role?: AgentDossier["role"]
): AgentIsolationViolation[] {
  const violations: AgentIsolationViolation[] = [];
  scan(value, violations, role, "$");
  return uniqueViolations(violations);
}

export function assertDossierIsolation(
  dossier: AgentDossier
): AgentIsolationViolation[] {
  const violations = detectAgentIsolationViolations(dossier, dossier.role);

  if (
    dossier.role === "coder" &&
    JSON.stringify(dossier.provenance).includes("reviewer_private")
  ) {
    violations.push({
      code: "coder_received_reviewer_private_notes",
      role: dossier.role,
      safeMessage: "Coder dossier cannot contain reviewer private notes"
    });
  }

  if (
    dossier.role === "reviewer" &&
    JSON.stringify(dossier.provenance).includes("coder_scratchpad")
  ) {
    violations.push({
      code: "reviewer_received_coder_scratchpad",
      role: dossier.role,
      safeMessage: "Reviewer dossier cannot contain coder scratchpad"
    });
  }

  if (
    dossier.role === "verifier" &&
    JSON.stringify(dossier.provenance).includes("raw_model_reasoning")
  ) {
    violations.push({
      code: "verifier_received_raw_model_reasoning",
      role: dossier.role,
      safeMessage: "Verifier dossier cannot contain raw model reasoning"
    });
  }

  return uniqueViolations(violations);
}

function scan(
  value: unknown,
  violations: AgentIsolationViolation[],
  role: AgentDossier["role"] | undefined,
  path: string
): void {
  if (typeof value === "string") {
    for (const pattern of forbiddenStringPatterns) {
      if (pattern.test(value)) {
        violations.push({
          code: "forbidden_raw_marker",
          ...(role !== undefined ? { role } : {}),
          safeMessage: `Dossier contains a forbidden raw marker at ${path}`
        });
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scan(item, violations, role, `${path}[${index}]`)
    );
    return;
  }

  if (typeof value !== "object" || value === null) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      forbiddenKeys.some(
        (forbidden) => key.toLowerCase() === forbidden.toLowerCase()
      )
    ) {
      violations.push({
        code: "forbidden_raw_field",
        ...(role !== undefined ? { role } : {}),
        safeMessage: `Dossier contains a forbidden raw field at ${path}.${key}`
      });
      continue;
    }
    scan(child, violations, role, `${path}.${key}`);
  }
}

function uniqueViolations(
  violations: readonly AgentIsolationViolation[]
): AgentIsolationViolation[] {
  const seen = new Set<string>();
  const unique: AgentIsolationViolation[] = [];
  for (const violation of violations) {
    const key = `${violation.code}:${violation.role ?? ""}:${violation.safeMessage}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(violation);
    }
  }
  return unique;
}
