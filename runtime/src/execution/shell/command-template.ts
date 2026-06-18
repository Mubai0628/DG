import { hashPatchObject } from "../patch/index.js";
import { shellIssue } from "./errors.js";
import {
  type ShellAllowlistIssue,
  type ShellAllowlistValidationResult,
  type ShellCommandTemplate
} from "./types.js";

const shellMetaPattern = /[;&|><`$(){}\r\n\0]/;
const blockedExecutables = new Set([
  "curl",
  "wget",
  "powershell",
  "cmd",
  "bash",
  "sh",
  "rm",
  "del",
  "format",
  "chmod",
  "chown",
  "sudo",
  "ssh",
  "scp"
]);

export function validateShellCommandTemplate(
  template: ShellCommandTemplate
): ShellAllowlistValidationResult {
  const errors: ShellAllowlistIssue[] = [];
  const warnings: ShellAllowlistIssue[] = [];

  if (template.id.length === 0) {
    errors.push(
      shellIssue("unknown_command", "Shell command template id is required.")
    );
  }
  if (template.argv.length === 0) {
    errors.push(
      shellIssue("unsafe_argv", "Shell command template argv is required.", {
        commandId: template.id
      })
    );
  }

  for (const token of template.argv) {
    errors.push(...validateArgvToken(token, template.id));
  }

  const executable = template.argv[0] ?? "";
  if (isUnsafeExecutable(executable)) {
    errors.push(
      shellIssue(
        "unsafe_executable",
        "Executable must be a fixed command name, not a path.",
        { commandId: template.id, value: executable }
      )
    );
  }
  if (blockedExecutables.has(executable.toLowerCase())) {
    errors.push(
      shellIssue("blocked_command", "Blocked executable is not allowed.", {
        commandId: template.id,
        value: executable
      })
    );
  }
  errors.push(...validateBlockedCommandPairs(template.argv, template.id));
  errors.push(...validateCwdPolicyValue(template.cwdPolicy.kind, template.id));
  errors.push(...validateTimeoutPolicy(template));
  errors.push(...validateOutputPolicy(template));

  if (
    template.executionMode === "REAL_DISABLED" &&
    template.disabledReason === undefined
  ) {
    errors.push(
      shellIssue(
        "blocked_command",
        "Real shell execution templates must include a disabled reason.",
        { commandId: template.id }
      )
    );
  }

  if (errors.length > 0) {
    return { ok: false, errors: uniqueIssues(errors), warnings };
  }
  return { ok: true, template: cloneShellCommandTemplate(template), warnings };
}

export function cloneShellCommandTemplate(
  template: ShellCommandTemplate
): ShellCommandTemplate {
  const clone: ShellCommandTemplate = {
    id: template.id,
    title: template.title,
    category: template.category,
    argv: [...template.argv],
    argSpecs: template.argSpecs.map((spec) => ({ ...spec })),
    cwdPolicy: { ...template.cwdPolicy },
    envPolicy: {
      allowedEnvNames: [...template.envPolicy.allowedEnvNames],
      denySecretEnvNames: template.envPolicy.denySecretEnvNames
    },
    timeoutPolicy: { ...template.timeoutPolicy },
    outputPolicy: { ...template.outputPolicy },
    executionMode: template.executionMode,
    riskLevel: template.riskLevel,
    description: template.description
  };
  if (template.disabledReason !== undefined) {
    clone.disabledReason = template.disabledReason;
  }
  return clone;
}

export function shellTemplateFingerprint(
  template: ShellCommandTemplate
): string {
  return hashPatchObject({
    id: template.id,
    argv: template.argv,
    timeoutPolicy: template.timeoutPolicy,
    outputPolicy: template.outputPolicy,
    executionMode: template.executionMode
  }).slice(0, 16);
}

export function validateArgvToken(
  token: string,
  commandId: string
): ShellAllowlistIssue[] {
  const errors: ShellAllowlistIssue[] = [];
  if (token.length === 0 || shellMetaPattern.test(token)) {
    errors.push(
      shellIssue(
        "unsafe_argv",
        "Command argv token contains unsafe shell characters.",
        { commandId, value: token }
      )
    );
  }
  if (token.includes("&&") || token.includes("||")) {
    errors.push(
      shellIssue("unsafe_argv", "Command chaining is not allowed.", {
        commandId,
        value: token
      })
    );
  }
  return errors;
}

export function isUnsafeExecutable(executable: string): boolean {
  return (
    executable.includes("/") ||
    executable.includes("\\") ||
    /^[a-zA-Z]:/.test(executable)
  );
}

export function validateCwdPath(
  cwd: string | undefined,
  commandId: string
): ShellAllowlistIssue[] {
  if (cwd === undefined || cwd.length === 0) {
    return [];
  }
  const normalized = cwd.replace(/\\/g, "/").trim();
  const errors: ShellAllowlistIssue[] = [];
  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.startsWith("//") ||
    normalized.includes("..")
  ) {
    errors.push(
      shellIssue("unsafe_cwd", "Command cwd must be a safe policy reference.", {
        commandId,
        value: cwd
      })
    );
  }
  if (
    /(^|\/)(node_modules|dist|target|\.git|\.tmp)(\/|$)/i.test(normalized) ||
    normalized.toLowerCase().startsWith("conformance/results") ||
    normalized.toLowerCase().startsWith("browser-extension/dist") ||
    normalized.toLowerCase().startsWith("runtime/dist") ||
    normalized.toLowerCase().startsWith("app/src-tauri/target")
  ) {
    errors.push(
      shellIssue(
        "unsafe_cwd",
        "Generated or control directories are not allowed as command cwd.",
        { commandId, value: cwd }
      )
    );
  }
  return errors;
}

function validateBlockedCommandPairs(
  argv: readonly string[],
  commandId: string
): ShellAllowlistIssue[] {
  const errors: ShellAllowlistIssue[] = [];
  const normalized = argv.map((token) => token.toLowerCase());
  const executable = normalized[0] ?? "";
  const subcommand = normalized[1] ?? "";

  if (
    (executable === "pnpm" || executable === "npm") &&
    subcommand === "install"
  ) {
    errors.push(
      shellIssue(
        "blocked_install_command",
        "Install commands are not allowed.",
        {
          commandId
        }
      )
    );
  }
  if (
    executable === "git" &&
    ["push", "checkout", "reset", "clean", "rebase", "merge"].includes(
      subcommand
    )
  ) {
    errors.push(
      shellIssue(
        "blocked_git_write_command",
        "Git write commands are not allowed through shell templates.",
        { commandId }
      )
    );
  }
  return errors;
}

function validateCwdPolicyValue(
  value: string,
  commandId: string
): ShellAllowlistIssue[] {
  if (value !== "repo_root" && value !== "workspace_root") {
    return [
      shellIssue("unsafe_cwd", "Unknown cwd policy.", {
        commandId,
        value
      })
    ];
  }
  return [];
}

function validateTimeoutPolicy(
  template: ShellCommandTemplate
): ShellAllowlistIssue[] {
  const { defaultMs, maxMs } = template.timeoutPolicy;
  if (
    !Number.isFinite(defaultMs) ||
    !Number.isFinite(maxMs) ||
    defaultMs <= 0 ||
    maxMs <= 0 ||
    defaultMs > maxMs ||
    maxMs > 600_000
  ) {
    return [
      shellIssue(
        "timeout_too_high",
        "Timeout policy is too large or invalid.",
        {
          commandId: template.id
        }
      )
    ];
  }
  return [];
}

function validateOutputPolicy(
  template: ShellCommandTemplate
): ShellAllowlistIssue[] {
  const policy = template.outputPolicy;
  if (
    !Number.isFinite(policy.maxStdoutBytes) ||
    !Number.isFinite(policy.maxStderrBytes) ||
    !Number.isFinite(policy.maxLines) ||
    policy.maxStdoutBytes <= 0 ||
    policy.maxStderrBytes <= 0 ||
    policy.maxLines <= 0 ||
    policy.includeFirstLines < 0 ||
    policy.maxStdoutBytes > 64_000 ||
    policy.maxStderrBytes > 64_000 ||
    policy.maxLines > 500
  ) {
    return [
      shellIssue(
        "unlimited_output",
        "Output policy must use bounded byte and line limits.",
        { commandId: template.id }
      )
    ];
  }
  return [];
}

function uniqueIssues(
  issues: readonly ShellAllowlistIssue[]
): ShellAllowlistIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.commandId ?? ""}:${issue.value ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
