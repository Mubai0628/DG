import { type AgentEvidenceRef } from "../../agents/index.js";
import { type ContextSegmentV2Input } from "../../context/index.js";
import { type EventStore } from "../../events/index.js";
import { type MemoryCandidate } from "../../memory/index.js";

export type ShellCommandId =
  | "pnpm.test"
  | "pnpm.lint"
  | "pnpm.typecheck"
  | "pnpm.verify_ci"
  | "cargo.check_tauri"
  | "tsc.runtime_build";

export type ShellCommandCategory =
  | "test"
  | "lint"
  | "typecheck"
  | "build"
  | "verify"
  | "audit"
  | "unknown";

export type ShellCommandRiskLevel =
  | "A1_read"
  | "A2_local_check"
  | "A3_real_disabled";

export type ShellExecutionMode = "PLAN_ONLY" | "SIMULATE" | "REAL_DISABLED";

export type ShellCommandPlanStatus =
  | "planned"
  | "disabled"
  | "approval_required"
  | "rejected"
  | "unknown_command";

export type ShellAllowlistErrorKind =
  | "unknown_command"
  | "arbitrary_command_string"
  | "unsafe_argv"
  | "unsafe_executable"
  | "blocked_command"
  | "blocked_install_command"
  | "blocked_git_write_command"
  | "unsafe_cwd"
  | "secret_env_name"
  | "timeout_too_high"
  | "unlimited_output"
  | "missing_fixture";

export type ShellAllowlistIssue = {
  kind: ShellAllowlistErrorKind;
  code: string;
  safeMessage: string;
  commandId?: string;
  value?: string;
};

export type ShellAllowlistError = ShellAllowlistIssue;

export type ShellCommandArgSpec = {
  name: string;
  required: boolean;
  allowedValues?: string[];
};

export type ShellCwdPolicy = {
  kind: "repo_root" | "workspace_root";
  allowSubdirectories: boolean;
};

export type ShellEnvPolicy = {
  allowedEnvNames: string[];
  denySecretEnvNames: true;
};

export type ShellTimeoutPolicy = {
  defaultMs: number;
  maxMs: number;
};

export type ShellOutputPolicy = {
  maxStdoutBytes: number;
  maxStderrBytes: number;
  maxLines: number;
  includeFirstLines: number;
};

export type ShellCommandTemplate = {
  id: ShellCommandId | string;
  title: string;
  category: ShellCommandCategory;
  argv: string[];
  argSpecs: ShellCommandArgSpec[];
  cwdPolicy: ShellCwdPolicy;
  envPolicy: ShellEnvPolicy;
  timeoutPolicy: ShellTimeoutPolicy;
  outputPolicy: ShellOutputPolicy;
  executionMode: ShellExecutionMode;
  riskLevel: ShellCommandRiskLevel;
  description: string;
  disabledReason?: string;
};

export type ShellAllowlist = {
  templates: ShellCommandTemplate[];
};

export type ShellAllowlistValidationResult =
  | {
      ok: true;
      template: ShellCommandTemplate;
      warnings: ShellAllowlistIssue[];
    }
  | {
      ok: false;
      errors: ShellAllowlistIssue[];
      warnings: ShellAllowlistIssue[];
    };

export type ShellPlanValidationResult = ShellAllowlistValidationResult;

export type ShellCommandPlanRequest = {
  planId?: string;
  commandId: string;
  cwd?: string;
  envNames?: string[];
  timeoutMs?: number;
  args?: Record<string, string>;
  command?: string;
  argv?: string[];
  executable?: string;
};

export type ShellCommandPlan = {
  planId: string;
  commandId: string;
  templateId?: string;
  category: ShellCommandCategory;
  status: ShellCommandPlanStatus;
  executionMode: ShellExecutionMode;
  argv: string[];
  cwdPolicy: ShellCwdPolicy;
  envPolicy: ShellEnvPolicy;
  timeoutMs: number;
  outputPolicy: ShellOutputPolicy;
  riskLevel: ShellCommandRiskLevel;
  reasons: string[];
  warnings: ShellAllowlistIssue[];
  createdAt: string;
  hash: string;
};

export type ShellFakeRunInput = {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut?: boolean;
};

export type ShellOutputFinding = {
  code:
    | "success_marker"
    | "failure_marker"
    | "panic_marker"
    | "type_error_marker"
    | "redaction";
  safeMessage: string;
  stream?: "stdout" | "stderr";
};

export type ShellOutputSummary = {
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutLineCount: number;
  stderrLineCount: number;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  safeStdoutPreview: string[];
  safeStderrPreview: string[];
  findings: ShellOutputFinding[];
  redactionCount: number;
};

export type ShellFakeRunResult =
  | {
      ok: true;
      plan: ShellCommandPlan;
      summary: ShellOutputSummary;
    }
  | {
      ok: false;
      plan: ShellCommandPlan;
      errors: ShellAllowlistIssue[];
    };

export type ShellCommandDescriptor = ShellCommandTemplate;

export type ShellCommandEventSummary = {
  commandId: string;
  templateId?: string;
  argvFingerprint: string;
  category: ShellCommandCategory;
  planStatus: ShellCommandPlanStatus;
  exitCode?: number;
  durationMs?: number;
  stdoutLineCount?: number;
  stderrLineCount?: number;
  findingCodes: string[];
  warningCodes: string[];
};

export type FakeShellRunnerFixtures = Partial<
  Record<string, ShellFakeRunInput>
>;

export type ShellRunner = {
  run(plan: ShellCommandPlan): ShellFakeRunResult;
};

export type ShellAllowlistOptions = {
  clock?: () => Date;
  idFactory?: () => string;
  eventStore?: EventStore;
};

export type ShellSummaryEvidenceInput = {
  commandId: string;
  summary: ShellOutputSummary;
  id?: string;
};

export type ShellIntegrationOutputs = {
  evidence: AgentEvidenceRef;
  segment: ContextSegmentV2Input;
  pitfall?: MemoryCandidate;
};
