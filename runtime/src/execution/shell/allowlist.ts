import {
  cloneShellCommandTemplate,
  validateShellCommandTemplate
} from "./command-template.js";
import {
  type ShellAllowlist,
  type ShellCommandCategory,
  type ShellCommandTemplate
} from "./types.js";

const defaultOutputPolicy = {
  maxStdoutBytes: 8_192,
  maxStderrBytes: 8_192,
  maxLines: 120,
  includeFirstLines: 5
};

const defaultEnvPolicy = {
  allowedEnvNames: [],
  denySecretEnvNames: true as const
};

const defaultCwdPolicy = {
  kind: "repo_root" as const,
  allowSubdirectories: false
};

export function createDefaultShellAllowlist(): ShellAllowlist {
  return {
    templates: [
      template("pnpm.test", "Run runtime tests", "test", ["pnpm", "test"]),
      template("pnpm.lint", "Run lint", "lint", ["pnpm", "lint"]),
      template("pnpm.typecheck", "Run typecheck", "typecheck", [
        "pnpm",
        "typecheck"
      ]),
      template("pnpm.verify_ci", "Run CI verification", "verify", [
        "pnpm",
        "verify:ci"
      ]),
      template("cargo.check_tauri", "Run Tauri cargo check", "typecheck", [
        "cargo",
        "check",
        "--manifest-path",
        "app/src-tauri/Cargo.toml"
      ]),
      template("tsc.runtime_build", "Build runtime package", "build", [
        "pnpm",
        "--filter",
        "@deepseek-workbench/runtime",
        "build"
      ])
    ]
  };
}

export function getShellCommandTemplate(
  allowlist: ShellAllowlist,
  commandId: string
): ShellCommandTemplate | undefined {
  const template = allowlist.templates.find((item) => item.id === commandId);
  return template === undefined
    ? undefined
    : cloneShellCommandTemplate(template);
}

export function listShellCommandTemplates(
  allowlist: ShellAllowlist
): ShellCommandTemplate[] {
  return allowlist.templates.map((item) => cloneShellCommandTemplate(item));
}

export function validateShellAllowlist(allowlist: ShellAllowlist): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const item of allowlist.templates) {
    if (seen.has(item.id)) {
      errors.push(`duplicate:${item.id}`);
    }
    seen.add(item.id);
    const result = validateShellCommandTemplate(item);
    if (!result.ok) {
      errors.push(...result.errors.map((error) => `${item.id}:${error.code}`));
    }
  }
  return { ok: errors.length === 0, errors };
}

function template(
  id: ShellCommandTemplate["id"],
  title: string,
  category: ShellCommandCategory,
  argv: string[]
): ShellCommandTemplate {
  return {
    id,
    title,
    category,
    argv,
    argSpecs: [],
    cwdPolicy: { ...defaultCwdPolicy },
    envPolicy: {
      allowedEnvNames: [...defaultEnvPolicy.allowedEnvNames],
      denySecretEnvNames: defaultEnvPolicy.denySecretEnvNames
    },
    timeoutPolicy: {
      defaultMs: 120_000,
      maxMs: 300_000
    },
    outputPolicy: { ...defaultOutputPolicy },
    executionMode: "SIMULATE",
    riskLevel: "A2_local_check",
    description:
      "Fixed argv shell allowlist template. P0F-008 only plans and simulates fixture output; it never executes a command."
  };
}
