import {
  buildExternalPluginSkillDescriptors,
  buildPluginSkillSandboxContract,
  scanCapabilityPackageMetadata,
  summarizeExternalPluginSkillDescriptors,
  summarizePluginSkillSandboxContract,
  validatePluginManifest,
  validateSkillManifest,
  type CapabilityPackageMetadataScanResult,
  type ExternalPluginSkillDescriptorResult,
  type PluginManifestValidationResult,
  type PluginSkillSandboxContract,
  type SkillManifestValidationResult
} from "../../runtime/src/capabilities/index.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type PluginSkillHostStatus =
  | "empty"
  | "preview_ready"
  | "warning"
  | "blocked";

export type PluginSkillHostFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type PluginSkillHostReadiness = {
  canPreviewMetadata: boolean;
  canPreviewBrokerDescriptors: boolean;
  canInstallPlugin: false;
  canRunSkill: false;
  canExecutePluginCapability: false;
  canInvokeCapability: false;
  canIssuePermissionLease: false;
  canWriteEventStore: false;
  canFetchNetwork: false;
  canUseTauri: false;
  appCanExecute: false;
};

export type PluginSkillHostView = {
  status: PluginSkillHostStatus;
  hostId: string;
  pluginManifestStatus: PluginManifestValidationResult["status"] | "empty";
  skillManifestStatus: SkillManifestValidationResult["status"] | "empty";
  packageScanStatus: CapabilityPackageMetadataScanResult["status"] | "empty";
  sandboxStatus: PluginSkillSandboxContract["status"] | "empty";
  brokerStatus: ExternalPluginSkillDescriptorResult["status"] | "empty";
  sandboxMode: PluginSkillSandboxContract["mode"] | "disabled";
  pluginCapabilityCount: number;
  skillStepCount: number;
  packageFileCount: number;
  scannerFindingCount: number;
  brokerDescriptorCount: number;
  pluginDescriptorCount: number;
  skillDescriptorCount: number;
  riskSummary: Record<string, number>;
  policySummary: Record<string, number>;
  brokerPreviewSummary?:
    | ReturnType<typeof summarizeExternalPluginSkillDescriptors>
    | undefined;
  sandboxSummary?:
    | ReturnType<typeof summarizePluginSkillSandboxContract>
    | undefined;
  findings: PluginSkillHostFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  hashPrefix?: string | undefined;
  readiness: PluginSkillHostReadiness;
  nextAction: string;
  source: "app_plugin_skill_host";
};

export type PluginSkillHostInput = {
  pluginManifestJsonText?: string | undefined;
  skillManifestJsonText?: string | undefined;
  packageMetadataJsonText?: string | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type PluginSkillHostSummary = {
  status: PluginSkillHostStatus;
  hostId: string;
  pluginManifestStatus: PluginSkillHostView["pluginManifestStatus"];
  skillManifestStatus: PluginSkillHostView["skillManifestStatus"];
  packageScanStatus: PluginSkillHostView["packageScanStatus"];
  sandboxStatus: PluginSkillHostView["sandboxStatus"];
  brokerStatus: PluginSkillHostView["brokerStatus"];
  sandboxMode: PluginSkillHostView["sandboxMode"];
  pluginCapabilityCount: number;
  skillStepCount: number;
  packageFileCount: number;
  scannerFindingCount: number;
  brokerDescriptorCount: number;
  blockerCount: number;
  warningCount: number;
  hashPrefix?: string | undefined;
  nextAction: string;
  source: "app_plugin_skill_host";
};

export function buildPluginSkillHostView(
  input: PluginSkillHostInput = {}
): PluginSkillHostView {
  const pluginText = safeText(input.pluginManifestJsonText, "");
  const skillText = safeText(input.skillManifestJsonText, "");
  const packageText = safeText(input.packageMetadataJsonText, "");
  const hasPluginText = pluginText.trim().length > 0;
  const hasSkillText = skillText.trim().length > 0;
  const hasPackageText = packageText.trim().length > 0;

  if (!hasPluginText && !hasSkillText && !hasPackageText) {
    const hash = hashText(
      stableStringify({
        createdAt: input.createdAt ?? "not-provided",
        status: "empty"
      })
    );
    return viewFrom({
      status: "empty",
      pluginManifestStatus: "empty",
      skillManifestStatus: "empty",
      packageScanStatus: "empty",
      sandboxStatus: "empty",
      brokerStatus: "empty",
      sandboxMode: "disabled",
      pluginCapabilityCount: 0,
      skillStepCount: 0,
      packageFileCount: 0,
      scannerFindingCount: 0,
      brokerDescriptorCount: 0,
      pluginDescriptorCount: 0,
      skillDescriptorCount: 0,
      riskSummary: {},
      policySummary: {},
      findings: [],
      hash,
      nextAction:
        "Paste plugin, skill, or package metadata JSON to preview summary-only host descriptors."
    });
  }

  const findings: PluginSkillHostFinding[] = [];
  const pluginParsed = hasPluginText
    ? parseJsonText(pluginText, "PLUGIN_MANIFEST")
    : undefined;
  const skillParsed = hasSkillText
    ? parseJsonText(skillText, "SKILL_MANIFEST")
    : undefined;
  const packageParsed = hasPackageText
    ? parseJsonText(packageText, "PACKAGE_METADATA")
    : undefined;

  [pluginParsed, skillParsed, packageParsed].forEach((parsed) => {
    if (parsed !== undefined && !parsed.ok) {
      findings.push(parsed.finding);
    }
  });

  const pluginManifestResult =
    pluginParsed?.ok === true
      ? validatePluginManifest(pluginParsed.value)
      : undefined;
  const skillManifestResult =
    skillParsed?.ok === true
      ? validateSkillManifest(skillParsed.value)
      : undefined;
  const packageScanResult =
    packageParsed?.ok === true
      ? scanCapabilityPackageMetadata(packageParsed.value)
      : undefined;
  const sandboxContract =
    findings.some((finding) => finding.severity === "blocker") &&
    pluginManifestResult === undefined &&
    skillManifestResult === undefined &&
    packageScanResult === undefined
      ? undefined
      : buildPluginSkillSandboxContract({
          mode: "simulated_builtin_safe",
          inputSummaryPolicy: "summary_only",
          outputSummaryPolicy: "summary_only",
          maxInputBytes: 4096,
          maxOutputBytes: 2048,
          timeoutMs: 1000,
          allowedSimulationKinds: [
            "summarize_manifest_risk",
            "classify_capability_risk",
            "validate_required_input_summary"
          ],
          denyPluginInstall: true,
          denySkillRuntime: true,
          denyNetwork: true,
          denyFilesystemWrite: true,
          denyEventStoreWrite: true,
          denyNativeBridge: true,
          denyDesktopAction: true
        });
  const descriptorResult =
    sandboxContract === undefined
      ? undefined
      : buildExternalPluginSkillDescriptors({
          pluginManifestResult,
          skillManifestResult,
          packageScanResult,
          sandboxContract
        });

  appendRuntimeFindings(findings, pluginManifestResult?.findings);
  appendRuntimeFindings(findings, skillManifestResult?.findings);
  appendRuntimeFindings(findings, packageScanResult?.findings);
  appendRuntimeFindings(findings, sandboxContract?.findings);
  appendRuntimeFindings(findings, descriptorResult?.findings);

  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: PluginSkillHostStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0 ||
          pluginManifestResult?.status === "warning" ||
          skillManifestResult?.status === "warning" ||
          packageScanResult?.status === "warning" ||
          sandboxContract?.status === "warning" ||
          descriptorResult?.status === "warning"
        ? "warning"
        : "preview_ready";
  const riskSummary = mergeCountMaps(
    countOne(pluginManifestResult?.summary.riskLevel),
    countOne(skillManifestResult?.riskLevel),
    countOne(packageScanResult?.riskLevel),
    descriptorResult?.riskMapping
  );
  const policySummary = mergeCountMaps(descriptorResult?.policyMapping);
  const hash = hashText(
    stableStringify({
      status,
      pluginHash: pluginManifestResult?.manifestHash,
      skillHash: skillManifestResult?.summaryHash,
      packageHash: packageScanResult?.packageHash,
      sandboxHash: sandboxContract?.contractHash,
      descriptorHash: descriptorResult?.descriptorHash,
      blockers: blockerCount,
      warnings: warningCount
    })
  );

  return viewFrom({
    status,
    pluginManifestStatus: pluginManifestResult?.status ?? "empty",
    skillManifestStatus: skillManifestResult?.status ?? "empty",
    packageScanStatus: packageScanResult?.status ?? "empty",
    sandboxStatus: sandboxContract?.status ?? "empty",
    brokerStatus: descriptorResult?.status ?? "empty",
    sandboxMode: sandboxContract?.mode ?? "disabled",
    pluginCapabilityCount: pluginManifestResult?.summary.capabilityCount ?? 0,
    skillStepCount: skillManifestResult?.stepCount ?? 0,
    packageFileCount: packageScanResult?.fileCount ?? 0,
    scannerFindingCount: packageScanResult?.findingCount ?? 0,
    brokerDescriptorCount: descriptorResult?.descriptorCount ?? 0,
    pluginDescriptorCount: descriptorResult?.pluginDescriptorCount ?? 0,
    skillDescriptorCount: descriptorResult?.skillDescriptorCount ?? 0,
    riskSummary,
    policySummary,
    brokerPreviewSummary:
      descriptorResult === undefined
        ? undefined
        : summarizeExternalPluginSkillDescriptors(descriptorResult),
    sandboxSummary:
      sandboxContract === undefined
        ? undefined
        : summarizePluginSkillSandboxContract(sandboxContract),
    findings,
    hash,
    nextAction: nextActionFor(status)
  });
}

export function summarizePluginSkillHostView(
  view: PluginSkillHostView
): PluginSkillHostSummary {
  return {
    status: view.status,
    hostId: view.hostId,
    pluginManifestStatus: view.pluginManifestStatus,
    skillManifestStatus: view.skillManifestStatus,
    packageScanStatus: view.packageScanStatus,
    sandboxStatus: view.sandboxStatus,
    brokerStatus: view.brokerStatus,
    sandboxMode: view.sandboxMode,
    pluginCapabilityCount: view.pluginCapabilityCount,
    skillStepCount: view.skillStepCount,
    packageFileCount: view.packageFileCount,
    scannerFindingCount: view.scannerFindingCount,
    brokerDescriptorCount: view.brokerDescriptorCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix,
    nextAction: view.nextAction,
    source: view.source
  };
}

export function pluginSkillHostWarningCodes(
  view: PluginSkillHostView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    "PLUGIN_SKILL_HOST_READ_ONLY",
    ...view.findings.map((finding) => finding.code)
  ];
}

function viewFrom(args: {
  status: PluginSkillHostStatus;
  pluginManifestStatus: PluginSkillHostView["pluginManifestStatus"];
  skillManifestStatus: PluginSkillHostView["skillManifestStatus"];
  packageScanStatus: PluginSkillHostView["packageScanStatus"];
  sandboxStatus: PluginSkillHostView["sandboxStatus"];
  brokerStatus: PluginSkillHostView["brokerStatus"];
  sandboxMode: PluginSkillHostView["sandboxMode"];
  pluginCapabilityCount: number;
  skillStepCount: number;
  packageFileCount: number;
  scannerFindingCount: number;
  brokerDescriptorCount: number;
  pluginDescriptorCount: number;
  skillDescriptorCount: number;
  riskSummary: Record<string, number>;
  policySummary: Record<string, number>;
  brokerPreviewSummary?: PluginSkillHostView["brokerPreviewSummary"];
  sandboxSummary?: PluginSkillHostView["sandboxSummary"];
  findings: PluginSkillHostFinding[];
  hash: string;
  nextAction: string;
}): PluginSkillHostView {
  const blockerCount = args.findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = args.findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  return {
    status: args.status,
    hostId: `plugin-skill-host-${args.hash.slice(0, 12)}`,
    pluginManifestStatus: args.pluginManifestStatus,
    skillManifestStatus: args.skillManifestStatus,
    packageScanStatus: args.packageScanStatus,
    sandboxStatus: args.sandboxStatus,
    brokerStatus: args.brokerStatus,
    sandboxMode: args.sandboxMode,
    pluginCapabilityCount: args.pluginCapabilityCount,
    skillStepCount: args.skillStepCount,
    packageFileCount: args.packageFileCount,
    scannerFindingCount: args.scannerFindingCount,
    brokerDescriptorCount: args.brokerDescriptorCount,
    pluginDescriptorCount: args.pluginDescriptorCount,
    skillDescriptorCount: args.skillDescriptorCount,
    riskSummary: args.riskSummary,
    policySummary: args.policySummary,
    brokerPreviewSummary: args.brokerPreviewSummary,
    sandboxSummary: args.sandboxSummary,
    findings: args.findings,
    blockerCount,
    warningCount,
    findingCount: args.findings.length,
    hashPrefix: args.hash.slice(0, 12),
    readiness: readinessFor(
      args.status !== "empty" && args.status !== "blocked"
    ),
    nextAction: args.nextAction,
    source: "app_plugin_skill_host"
  };
}

function parseJsonText(
  text: string,
  label: string
):
  | { ok: true; value: unknown }
  | { ok: false; finding: PluginSkillHostFinding } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      finding: finding(
        `${label}_JSON_PARSE_FAILED`,
        "blocker",
        `${label.toLowerCase().replace(/_/g, " ")} JSON could not be parsed.`
      )
    };
  }
}

function appendRuntimeFindings(
  target: PluginSkillHostFinding[],
  findings:
    | Array<{
        code: string;
        severity: "blocker" | "warning";
        safeMessage: string;
      }>
    | undefined
): void {
  findings?.forEach((sourceFinding) => {
    target.push(
      finding(
        sourceFinding.code,
        sourceFinding.severity,
        sourceFinding.safeMessage
      )
    );
  });
}

function readinessFor(canPreviewMetadata: boolean): PluginSkillHostReadiness {
  return {
    canPreviewMetadata,
    canPreviewBrokerDescriptors: canPreviewMetadata,
    canInstallPlugin: false,
    canRunSkill: false,
    canExecutePluginCapability: false,
    canInvokeCapability: false,
    canIssuePermissionLease: false,
    canWriteEventStore: false,
    canFetchNetwork: false,
    canUseTauri: false,
    appCanExecute: false
  };
}

function nextActionFor(status: PluginSkillHostStatus): string {
  if (status === "blocked") {
    return "Reject the plugin/skill metadata until unsafe fields are removed.";
  }
  if (status === "warning") {
    return "Review warning codes only. Plugin install, skill runtime, and capability execution remain disabled.";
  }
  if (status === "preview_ready") {
    return "Display descriptor summaries only. Install, runtime, invocation, and leases remain disabled.";
  }
  return "Paste plugin, skill, or package metadata JSON to preview summary-only host descriptors.";
}

function finding(
  code: string,
  severity: "blocker" | "warning",
  safeMessage: string
): PluginSkillHostFinding {
  return {
    code: safeCode(code),
    severity,
    safeMessage: safeErrorMessage(safeMessage)
  };
}

function safeCode(code: string): string {
  return safeText(code, "PLUGIN_SKILL_HOST_FINDING").replace(
    /[^A-Z0-9_]/gi,
    "_"
  );
}

function countOne(key: string | undefined): Record<string, number> {
  return key === undefined ? {} : { [key]: 1 };
}

function mergeCountMaps(
  ...maps: Array<Record<string, number> | undefined>
): Record<string, number> {
  const result: Record<string, number> = {};
  maps.forEach((map) => {
    Object.entries(map ?? {}).forEach(([key, value]) => {
      result[key] = (result[key] ?? 0) + value;
    });
  });
  return result;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").repeat(8);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
