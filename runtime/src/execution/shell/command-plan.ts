import { hashPatchObject } from "../patch/index.js";
import {
  shellTemplateFingerprint,
  validateArgvToken,
  validateCwdPath,
  validateShellCommandTemplate
} from "./command-template.js";
import { getShellCommandTemplate } from "./allowlist.js";
import { shellIssue } from "./errors.js";
import { validateShellEnvNames } from "./env-policy.js";
import {
  type ShellAllowlist,
  type ShellAllowlistIssue,
  type ShellAllowlistOptions,
  type ShellCommandPlan,
  type ShellCommandPlanRequest
} from "./types.js";

export function planShellCommand(
  request: ShellCommandPlanRequest,
  allowlist: ShellAllowlist,
  options: ShellAllowlistOptions = {}
): ShellCommandPlan {
  const now = (options.clock?.() ?? new Date()).toISOString();
  const planId = request.planId ?? options.idFactory?.() ?? "shell-plan-1";
  const template = getShellCommandTemplate(allowlist, request.commandId);
  const warnings: ShellAllowlistIssue[] = [];
  const reasons: string[] = [];
  const errors: ShellAllowlistIssue[] = [];

  if (hasArbitraryCommandFields(request)) {
    errors.push(
      shellIssue(
        "arbitrary_command_string",
        "Arbitrary command strings or executable paths are not accepted.",
        { commandId: request.commandId }
      )
    );
  }

  if (template === undefined) {
    reasons.push("unknown_command");
    return finalizePlan(
      {
        planId,
        commandId: request.commandId,
        category: "unknown",
        status: "unknown_command",
        executionMode: "REAL_DISABLED",
        argv: [],
        cwdPolicy: { kind: "repo_root", allowSubdirectories: false },
        envPolicy: { allowedEnvNames: [], denySecretEnvNames: true },
        timeoutMs: 0,
        outputPolicy: {
          maxStdoutBytes: 1,
          maxStderrBytes: 1,
          maxLines: 1,
          includeFirstLines: 0
        },
        riskLevel: "A3_real_disabled",
        reasons,
        warnings: [...warnings, ...errors],
        createdAt: now
      },
      options
    );
  }

  const templateValidation = validateShellCommandTemplate(template);
  if (!templateValidation.ok) {
    errors.push(...templateValidation.errors);
  }
  errors.push(...validateRequestArgs(request, template.id));
  errors.push(...validateCwdPath(request.cwd, template.id));
  errors.push(...validateShellEnvNames(request.envNames, template.id));

  const timeoutMs = request.timeoutMs ?? template.timeoutPolicy.defaultMs;
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > template.timeoutPolicy.maxMs
  ) {
    errors.push(
      shellIssue(
        "timeout_too_high",
        "Requested timeout exceeds template policy.",
        { commandId: template.id }
      )
    );
  }

  let status: ShellCommandPlan["status"] = "planned";
  if (template.executionMode === "REAL_DISABLED") {
    status = "disabled";
    reasons.push(template.disabledReason ?? "real shell execution is disabled");
  } else if (errors.length > 0) {
    status = "rejected";
    reasons.push(...uniqueStrings(errors.map((error) => error.code)));
  }

  return finalizePlan(
    {
      planId,
      commandId: template.id,
      templateId: template.id,
      category: template.category,
      status,
      executionMode: template.executionMode,
      argv: status === "planned" ? [...template.argv] : [],
      cwdPolicy: { ...template.cwdPolicy },
      envPolicy: {
        allowedEnvNames: [...template.envPolicy.allowedEnvNames],
        denySecretEnvNames: template.envPolicy.denySecretEnvNames
      },
      timeoutMs: status === "planned" ? timeoutMs : 0,
      outputPolicy: { ...template.outputPolicy },
      riskLevel: status === "planned" ? template.riskLevel : "A3_real_disabled",
      reasons,
      warnings: [...warnings, ...errors],
      createdAt: now
    },
    options
  );
}

function validateRequestArgs(
  request: ShellCommandPlanRequest,
  commandId: string
): ShellAllowlistIssue[] {
  const errors: ShellAllowlistIssue[] = [];
  for (const value of Object.values(request.args ?? {})) {
    errors.push(...validateArgvToken(value, commandId));
  }
  return errors;
}

function hasArbitraryCommandFields(request: ShellCommandPlanRequest): boolean {
  return (
    request.command !== undefined ||
    request.argv !== undefined ||
    request.executable !== undefined
  );
}

function finalizePlan(
  input: Omit<ShellCommandPlan, "hash">,
  options: ShellAllowlistOptions
): ShellCommandPlan {
  const hash = hashPatchObject({
    planId: input.planId,
    commandId: input.commandId,
    templateId: input.templateId,
    status: input.status,
    argvFingerprint:
      input.argv.length === 0
        ? "none"
        : hashPatchObject({ argv: input.argv }).slice(0, 16),
    templateFingerprint:
      input.argv.length === 0
        ? "none"
        : shellTemplateFingerprint({
            id: input.commandId,
            title: input.commandId,
            category: input.category,
            argv: input.argv,
            argSpecs: [],
            cwdPolicy: input.cwdPolicy,
            envPolicy: input.envPolicy,
            timeoutPolicy: {
              defaultMs: input.timeoutMs,
              maxMs: input.timeoutMs
            },
            outputPolicy: input.outputPolicy,
            executionMode: input.executionMode,
            riskLevel: input.riskLevel,
            description: "plan fingerprint"
          }),
    createdAt: input.createdAt
  });
  const plan: ShellCommandPlan = {
    ...input,
    hash
  };

  options.eventStore?.appendEvent({
    type:
      plan.status === "planned"
        ? "shell.command.planned"
        : "shell.command.rejected",
    payload: {
      commandId: plan.commandId,
      templateId: plan.templateId,
      argvFingerprint: hashPatchObject({ argv: plan.argv }).slice(0, 16),
      category: plan.category,
      planStatus: plan.status,
      warningCodes: plan.warnings.map((warning) => warning.code),
      findingCodes: [],
      riskLevel: plan.riskLevel,
      hash: plan.hash
    }
  });

  return plan;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}
