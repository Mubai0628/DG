import { type CapabilityDescriptor } from "../../capabilities/index.js";
import { createDefaultShellAllowlist } from "./allowlist.js";

export function createShellCapabilityDescriptors(): CapabilityDescriptor[] {
  return createDefaultShellAllowlist().templates.map((template) => ({
    id: `native.shell.${template.id.replace(".", "_")}`,
    title: template.title,
    sourceType: "native",
    category: "shell",
    riskLevel: "A1_read",
    invokePolicy: "DISABLED",
    executionMode: "SIMULATE",
    inputSchema: {
      type: "object",
      properties: {
        commandId: { const: template.id }
      }
    },
    outputSchema: {
      type: "object",
      summaryOnly: true
    },
    supportsDryRun: true,
    requiresElicitation: true,
    canWriteMemory: false,
    trustTier: "core",
    version: "0.2.0",
    owner: "runtime",
    description:
      "Shell Allowlist descriptor. Disabled in P0F-008; shell commands are plan-only and fake-runner-only.",
    eventTypes: [
      "shell.command.planned",
      "shell.command.rejected",
      "shell.command.simulated",
      "shell.output.summarized"
    ],
    disabledReason:
      "Real shell execution is disabled; this descriptor only documents a future approval-gated simulation lane."
  }));
}
