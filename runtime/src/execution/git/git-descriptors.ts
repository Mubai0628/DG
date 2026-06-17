import { type CapabilityDescriptor } from "../../capabilities/index.js";

export function createGitReadCapabilityDescriptors(): CapabilityDescriptor[] {
  return [
    readDescriptor("native.git.status", "Git status summary", "status"),
    readDescriptor(
      "native.git.diff_summary",
      "Git diff summary",
      "diff_summary"
    ),
    readDescriptor("native.git.log_summary", "Git log summary", "log_summary"),
    readDescriptor(
      "native.git.branch_summary",
      "Git branch summary",
      "branch_summary"
    )
  ];
}

export function createGitCommitDraftDescriptor(): CapabilityDescriptor {
  return {
    id: "native.git.commit_draft",
    title: "Draft Git commit intent",
    sourceType: "native",
    category: "git",
    riskLevel: "A3_scoped_write",
    invokePolicy: "DISABLED",
    executionMode: "SIMULATE",
    inputSchema: {
      type: "object",
      required: ["summary", "patchProposalRefs", "auditReportRefs"]
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
      "Future Git commit draft descriptor. Disabled in P0F-007; Git Safe Lanes only support planning and fake read summaries.",
    eventTypes: ["git.write_intent.disabled"],
    disabledReason: "Git write lanes are disabled in this phase."
  };
}

function readDescriptor(
  id: string,
  title: string,
  commandKind: string
): CapabilityDescriptor {
  return {
    id,
    title,
    sourceType: "native",
    category: "git",
    riskLevel: "A1_read",
    invokePolicy: "ASK_FIRST",
    executionMode: "SIMULATE",
    inputSchema: {
      type: "object",
      properties: {
        commandKind: { const: commandKind },
        pathspecs: { type: "array", items: { type: "string" } }
      }
    },
    outputSchema: {
      type: "object",
      summaryOnly: true
    },
    supportsDryRun: true,
    requiresElicitation: false,
    canWriteMemory: false,
    trustTier: "core",
    version: "0.2.0",
    owner: "runtime",
    description:
      "Read-only Git Safe Lane descriptor. P0F-007 plans and parses fake summaries only; it does not execute git.",
    eventTypes: [
      "git.command.planned",
      "git.command.rejected",
      "git.summary.produced"
    ]
  };
}
