import { stablePreviewHash } from "../../models/stable-preview-hash.js";
import {
  type CommandExecutionMode,
  type CommandShellKind
} from "./command-policy.js";

export type DangerousCommandCategory =
  | "destructive_delete"
  | "recursive_delete"
  | "force_delete"
  | "format_disk"
  | "permission_change"
  | "ownership_change"
  | "shell_download_execute"
  | "credential_exfiltration"
  | "network_exfiltration"
  | "package_script_execution"
  | "git_write"
  | "git_remote_push"
  | "git_history_rewrite"
  | "process_kill"
  | "background_daemon"
  | "native_bridge_attempt"
  | "desktop_action_attempt"
  | "environment_secret_access"
  | "system_path_write"
  | "workspace_escape"
  | "unknown_high_risk";

export type DangerousCommandRiskLevel =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type DangerousCommandClassifierStatus = "safe" | "warning" | "blocked";

export type DangerousCommandClassifierSeverity = "warning" | "blocker";

export type DangerousCommandClassifierFinding = {
  findingId: string;
  category: DangerousCommandCategory;
  severity: DangerousCommandClassifierSeverity;
  code: string;
  safeMessage: string;
};

export type DangerousCommandClassifierReadiness = {
  canEnterCommandBrokerPolicy: boolean;
  canExecuteCommand: false;
  canSpawnProcess: false;
  canWriteFilesystem: false;
  canExecuteGitWrite: false;
  canRunBackgroundProcess: false;
  canReadApiKey: false;
  canFetchNetwork: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canUseNativeBridge: false;
  canExecuteDesktopAction: false;
  appCanExecute: false;
};

export type DangerousCommandClassifierInput = {
  commandText?: string | undefined;
  argv?: string[] | undefined;
  shellKind?: CommandShellKind | string | undefined;
  workingDirectoryRef?: string | undefined;
  workspaceRootRef?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type DangerousCommandClassification = {
  status: DangerousCommandClassifierStatus;
  classificationId: string;
  riskLevel: DangerousCommandRiskLevel;
  categories: DangerousCommandCategory[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  suggestedMode: CommandExecutionMode;
  requiresApproval: boolean;
  requiresFullAccess: boolean;
  commandHash?: string | undefined;
  argvCount: number;
  findings: DangerousCommandClassifierFinding[];
  readiness: DangerousCommandClassifierReadiness;
  classificationHash: string;
  nextAction: string;
  source: "runtime_dangerous_command_classifier";
  summaryOnly: true;
};

export type DangerousCommandClassificationSummary = {
  status: DangerousCommandClassifierStatus;
  classificationId: string;
  riskLevel: DangerousCommandRiskLevel;
  categories: DangerousCommandCategory[];
  blockerCount: number;
  warningCount: number;
  suggestedMode: CommandExecutionMode;
  requiresApproval: boolean;
  requiresFullAccess: boolean;
  commandHash?: string | undefined;
  classificationHash: string;
  readiness: DangerousCommandClassifierReadiness;
  source: "runtime_dangerous_command_classifier_summary";
  summaryOnly: true;
};

type CategoryRule = {
  category: DangerousCommandCategory;
  severity: DangerousCommandClassifierSeverity;
  riskLevel: DangerousCommandRiskLevel;
  pattern: RegExp;
};

const SOURCE = "runtime_dangerous_command_classifier" as const;
const rawFieldPrefix = "raw";
const nativeMessagingMarker = ["native", "Messaging"].join("");
const nativeBridgeMarker = ["native", "[_ -]?bridge"].join("");
const desktopActionMarker = ["desktop", "Action"].join("");

const secretTextPatterns = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /\bBearer\s+[A-Za-z0-9._-]{12,}\b/i,
  /\bAuthorization\s*[:=]/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/
];

const categoryRules: CategoryRule[] = [
  {
    category: "recursive_delete",
    severity: "blocker",
    riskLevel: "critical",
    pattern:
      /\brm\s+-[^\s]*r[^\s]*f|\bRemove-Item\b[^\r\n;|&]*(?:^|\s)-Recurse\b|\brd\s+\/s|\brmdir\s+\/s/i
  },
  {
    category: "force_delete",
    severity: "blocker",
    riskLevel: "high",
    pattern:
      /\brm\s+-[^\s]*f|\bdel\s+\/[a-z]*f|\bRemove-Item\b[^\r\n;|&]*(?:^|\s)-Force\b/i
  },
  {
    category: "destructive_delete",
    severity: "blocker",
    riskLevel: "high",
    pattern: /\b(del|rmdir|rd|rm|Remove-Item)\b/i
  },
  {
    // Known false positive (fail-closed, kept deliberately): the bare
    // "format" token also matches "git format-patch", "clang-format", etc.
    category: "format_disk",
    severity: "blocker",
    riskLevel: "critical",
    pattern: /\b(format|mkfs(?:\.[a-z0-9]+)?|diskpart)\b/i
  },
  {
    category: "permission_change",
    severity: "blocker",
    riskLevel: "high",
    pattern: /\b(chmod|icacls)\b/i
  },
  {
    category: "ownership_change",
    severity: "blocker",
    riskLevel: "high",
    pattern: /\b(chown|takeown)\b/i
  },
  {
    category: "shell_download_execute",
    severity: "blocker",
    riskLevel: "critical",
    pattern:
      /\b(curl|wget|Invoke-WebRequest|iwr)\b(?=.*(\|\s*(sh|bash|powershell|pwsh)|Invoke-Expression|\biex\b))|\bNet\.WebClient\b|\bDownloadString\b/i
  },
  {
    category: "credential_exfiltration",
    severity: "blocker",
    riskLevel: "critical",
    pattern: /\b(\.ssh|id_rsa|aws\/credentials|\.env|Get-Content\s+env:)\b/i
  },
  {
    category: "network_exfiltration",
    severity: "blocker",
    riskLevel: "high",
    pattern:
      /\b(curl|wget|Invoke-RestMethod|Invoke-WebRequest|iwr|scp|nc|netcat)\b(?=.*(-d|--data|--upload-file|-Method\s+POST|POST|http))/i
  },
  {
    category: "package_script_execution",
    severity: "warning",
    riskLevel: "medium",
    pattern: /\b(npm|pnpm|yarn)\s+(run|exec)|\bnpx\b/i
  },
  {
    category: "git_remote_push",
    severity: "blocker",
    riskLevel: "critical",
    pattern: /\bgit\s+push\b/i
  },
  {
    category: "git_history_rewrite",
    severity: "blocker",
    riskLevel: "critical",
    pattern:
      /\bgit\s+(reset|rebase|filter-branch)\b|\bgit\s+commit\b(?=.*--amend)|\bgit\s+push\b(?=.*--force)/i
  },
  {
    category: "git_write",
    severity: "blocker",
    riskLevel: "high",
    pattern:
      /\bgit\s+(add|commit|clean|checkout|switch|merge|stash|tag|apply)\b/i
  },
  {
    category: "process_kill",
    severity: "blocker",
    riskLevel: "high",
    pattern: /\b(kill|taskkill|Stop-Process)\b/i
  },
  {
    category: "background_daemon",
    severity: "blocker",
    riskLevel: "high",
    pattern: /\b(nohup|Start-Process|Start-Job)\b|(^|[^&])&\s*$/i
  },
  {
    category: "native_bridge_attempt",
    severity: "blocker",
    riskLevel: "critical",
    pattern: new RegExp(
      `\\b(${nativeMessagingMarker}|${nativeBridgeMarker})\\b`,
      "i"
    )
  },
  {
    category: "desktop_action_attempt",
    severity: "blocker",
    riskLevel: "critical",
    pattern: new RegExp(`\\b(${desktopActionMarker}|xdotool|osascript)\\b`, "i")
  },
  {
    category: "environment_secret_access",
    severity: "blocker",
    riskLevel: "critical",
    pattern:
      /(?:\$env:|%)[A-Z0-9_]*(API_KEY|TOKEN|SECRET|AUTHORIZATION|PASSWORD|BEARER)|\b(printenv|set)\b(?=.*(API_KEY|TOKEN|SECRET|AUTHORIZATION|PASSWORD|BEARER))/i
  },
  {
    category: "system_path_write",
    severity: "blocker",
    riskLevel: "critical",
    pattern:
      /(\bC:\\Windows\b|\bSystem32\b|\bProgram Files\b|\/etc\/|\/usr\/bin\/|\/System\/Library\/|\bHKLM\\)/i
  },
  {
    category: "workspace_escape",
    severity: "blocker",
    riskLevel: "high",
    pattern: /(^|\s)(\.\.\/|\.\.\\)|\b[A-Za-z]:\\|\\\\[A-Za-z0-9_.-]+\\/i
  },
  {
    // Covers privilege escalation and Windows LOLBin execution markers,
    // including abbreviated PowerShell flags (-e/-ec/-enc/-c) and bare iex.
    category: "unknown_high_risk",
    severity: "blocker",
    riskLevel: "high",
    pattern:
      /\b(sudo|doas|powershell\s+-(?:EncodedCommand|e|ec|enc)\b|powershell\s+-c\b|cmd\s+\/c|bash\s+-c|sh\s+-c|iex|certutil|mshta|rundll32|bitsadmin)\b/i
  }
];

export function classifyDangerousCommand(
  input: DangerousCommandClassifierInput = {}
): DangerousCommandClassification {
  const commandText = buildCommandText(input);
  const findings = validateDangerousCommandClassifierInput(input);
  for (const rule of categoryRules) {
    if (rule.pattern.test(commandText)) {
      findings.push(finding(rule.category, rule.severity));
    }
  }

  for (const pattern of secretTextPatterns) {
    if (pattern.test(commandText)) {
      findings.push(finding("credential_exfiltration", "blocker"));
    }
  }

  const deduped = dedupeFindings(findings);
  const categories = deduped.map((item) => item.category);
  const blockerCount = countSeverity(deduped, "blocker");
  const warningCount = countSeverity(deduped, "warning");
  const riskLevel = riskForCategories(categories);
  const status: DangerousCommandClassifierStatus =
    blockerCount > 0 ? "blocked" : warningCount > 0 ? "warning" : "safe";
  const commandHash =
    commandText.trim().length > 0 ? stablePreviewHash(commandText) : undefined;
  const classificationId =
    input.idGenerator?.() ??
    `dangerous-command-${stablePreviewHash(
      stableStringify({
        commandHash,
        shellKind: input.shellKind,
        workingDirectoryHash: hashMaybe(input.workingDirectoryRef),
        workspaceRootHash: hashMaybe(input.workspaceRootRef),
        createdAt: input.createdAt
      })
    ).slice(0, 16)}`;
  const requiresFullAccess = categories.some((category) =>
    fullAccessCategories.has(category)
  );
  const suggestedMode = suggestedModeFor(status, requiresFullAccess);
  const withoutHash = {
    status,
    classificationId,
    riskLevel,
    categories,
    blockerCount,
    warningCount,
    suggestedMode,
    requiresApproval: categories.length > 0,
    requiresFullAccess,
    commandHash,
    argvCount: input.argv?.length ?? 0,
    findings: deduped.map((item) => ({
      category: item.category,
      severity: item.severity,
      code: item.code
    })),
    source: SOURCE,
    summaryOnly: true
  };
  const classificationHash = stablePreviewHash(stableStringify(withoutHash));

  return {
    status,
    classificationId,
    riskLevel,
    categories,
    blockerCount,
    warningCount,
    findingCount: deduped.length,
    suggestedMode,
    requiresApproval: categories.length > 0,
    requiresFullAccess,
    commandHash,
    argvCount: input.argv?.length ?? 0,
    findings: deduped,
    readiness: readinessFor(status),
    classificationHash,
    nextAction: nextActionFor(status),
    source: SOURCE,
    summaryOnly: true
  };
}

export function validateDangerousCommandClassifierInput(
  input: DangerousCommandClassifierInput = {}
): DangerousCommandClassifierFinding[] {
  const findings: DangerousCommandClassifierFinding[] = [];
  const commandText = buildCommandText(input);

  if (commandText.trim().length === 0) {
    findings.push(finding("unknown_high_risk", "blocker", "EMPTY_COMMAND"));
  }

  scanForRawMarkers(input, findings);

  return dedupeFindings(findings);
}

export function summarizeDangerousCommandClassification(
  classification: DangerousCommandClassification
): DangerousCommandClassificationSummary {
  return {
    status: classification.status,
    classificationId: classification.classificationId,
    riskLevel: classification.riskLevel,
    categories: classification.categories,
    blockerCount: classification.blockerCount,
    warningCount: classification.warningCount,
    suggestedMode: classification.suggestedMode,
    requiresApproval: classification.requiresApproval,
    requiresFullAccess: classification.requiresFullAccess,
    commandHash: classification.commandHash,
    classificationHash: classification.classificationHash,
    readiness: classification.readiness,
    source: "runtime_dangerous_command_classifier_summary",
    summaryOnly: true
  };
}

const fullAccessCategories = new Set<DangerousCommandCategory>([
  "format_disk",
  "permission_change",
  "ownership_change",
  "system_path_write",
  "workspace_escape",
  "native_bridge_attempt",
  "desktop_action_attempt",
  "unknown_high_risk"
]);

function buildCommandText(input: DangerousCommandClassifierInput): string {
  return [input.commandText ?? "", ...(input.argv ?? [])].join(" ");
}

function scanForRawMarkers(
  value: unknown,
  findings: DangerousCommandClassifierFinding[]
): void {
  if (typeof value === "string") {
    if (/\braw[_ -]?(prompt|response|source|diff|output)\b/i.test(value)) {
      findings.push(finding("unknown_high_risk", "blocker", "RAW_MARKER"));
    }
    if (/\breasoning[_ -]?content\b/i.test(value)) {
      findings.push(
        finding("unknown_high_risk", "blocker", "REASONING_MARKER")
      );
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => scanForRawMarkers(item, findings));
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey.startsWith(rawFieldPrefix) ||
      normalizedKey.includes("reasoning") ||
      normalizedKey.includes("apikey") ||
      normalizedKey.includes("authorization") ||
      normalizedKey.includes("token") ||
      normalizedKey.includes("secret")
    ) {
      findings.push(finding("unknown_high_risk", "blocker", "RAW_FIELD"));
    }
    scanForRawMarkers(item, findings);
  }
}

function riskForCategories(
  categories: DangerousCommandCategory[]
): DangerousCommandRiskLevel {
  let risk: DangerousCommandRiskLevel = categories.length > 0 ? "low" : "none";
  for (const category of categories) {
    const rule = categoryRules.find((item) => item.category === category);
    if (rule) {
      risk = maxRisk(risk, rule.riskLevel);
    }
  }
  return risk;
}

function maxRisk(
  left: DangerousCommandRiskLevel,
  right: DangerousCommandRiskLevel
): DangerousCommandRiskLevel {
  const order: DangerousCommandRiskLevel[] = [
    "none",
    "low",
    "medium",
    "high",
    "critical"
  ];
  return order.indexOf(right) > order.indexOf(left) ? right : left;
}

function suggestedModeFor(
  status: DangerousCommandClassifierStatus,
  requiresFullAccess: boolean
): CommandExecutionMode {
  if (requiresFullAccess) {
    return "full_access";
  }
  if (status === "safe") {
    return "approval";
  }
  return "advanced_workspace";
}

function readinessFor(
  status: DangerousCommandClassifierStatus
): DangerousCommandClassifierReadiness {
  return {
    canEnterCommandBrokerPolicy: status !== "blocked",
    canExecuteCommand: false,
    canSpawnProcess: false,
    canWriteFilesystem: false,
    canExecuteGitWrite: false,
    canRunBackgroundProcess: false,
    canReadApiKey: false,
    canFetchNetwork: false,
    canWriteEventStore: false,
    canApplyPatch: false,
    canRollback: false,
    canUseNativeBridge: false,
    canExecuteDesktopAction: false,
    appCanExecute: false
  };
}

function nextActionFor(status: DangerousCommandClassifierStatus): string {
  if (status === "blocked") {
    return "Do not execute; route through command broker safety planning and user review.";
  }
  if (status === "warning") {
    return "Review warning categories before any later broker phase.";
  }
  return "Command has no classifier hits; execution remains disabled until later broker phases.";
}

function countSeverity(
  findings: DangerousCommandClassifierFinding[],
  severity: DangerousCommandClassifierSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function dedupeFindings(
  findings: DangerousCommandClassifierFinding[]
): DangerousCommandClassifierFinding[] {
  const seen = new Set<string>();
  const deduped: DangerousCommandClassifierFinding[] = [];
  for (const item of findings) {
    const key = `${item.category}:${item.severity}:${item.code}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function finding(
  category: DangerousCommandCategory,
  severity: DangerousCommandClassifierSeverity,
  code = category.toUpperCase()
): DangerousCommandClassifierFinding {
  return {
    findingId: `dangerous-command-${category}-${stablePreviewHash(
      `${category}:${severity}:${code}`
    ).slice(0, 10)}`,
    category,
    severity,
    code,
    safeMessage: safeMessageFor(category, code)
  };
}

function safeMessageFor(
  category: DangerousCommandCategory,
  code: string
): string {
  if (code === "EMPTY_COMMAND") {
    return "Command classifier requires command metadata.";
  }
  if (code === "RAW_MARKER" || code === "RAW_FIELD") {
    return "Raw content markers are not allowed in classifier input.";
  }
  if (code === "REASONING_MARKER") {
    return "Reasoning content markers are not allowed in classifier input.";
  }
  const messages: Record<DangerousCommandCategory, string> = {
    destructive_delete: "Command appears to delete filesystem content.",
    recursive_delete: "Command appears to delete recursively.",
    force_delete: "Command appears to force deletion.",
    format_disk: "Command appears to format or manipulate disks.",
    permission_change: "Command appears to change permissions.",
    ownership_change: "Command appears to change ownership.",
    shell_download_execute:
      "Command appears to download content and execute it.",
    credential_exfiltration:
      "Command appears to access credential-bearing locations.",
    network_exfiltration: "Command appears able to send data over the network.",
    package_script_execution:
      "Command appears to run package-defined or dynamic scripts.",
    git_write: "Command appears to mutate Git state.",
    git_remote_push: "Command appears to push to a Git remote.",
    git_history_rewrite: "Command appears to rewrite Git history.",
    process_kill: "Command appears to kill processes.",
    background_daemon:
      "Command appears to launch or continue a background process.",
    native_bridge_attempt: "Command appears to touch native bridge surfaces.",
    desktop_action_attempt:
      "Command appears to trigger desktop action automation.",
    environment_secret_access:
      "Command appears to access secret-like environment variables.",
    system_path_write: "Command appears to target system paths.",
    workspace_escape:
      "Command appears to escape the declared workspace boundary.",
    unknown_high_risk:
      "Command contains high-risk shell or privilege escalation markers."
  };
  return messages[category];
}

function hashMaybe(value: string | undefined): string | undefined {
  return value && value.trim().length > 0
    ? stablePreviewHash(value)
    : undefined;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}
