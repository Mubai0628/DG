import { type CapabilityDescriptor } from "../capabilities/index.js";

export function createNativeWorkspaceIndexDescriptor(): CapabilityDescriptor {
  return {
    id: "native.workspace.index",
    title: "Build virtual workspace index",
    sourceType: "native",
    category: "knowledge",
    riskLevel: "A1_read",
    invokePolicy: "ASK_FIRST",
    executionMode: "SIMULATE",
    inputSchema: {
      type: "object",
      required: ["files"]
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
      "Read-only Workspace Read / Index descriptor. P0G-001 indexes virtual inputs only and does not crawl the real filesystem.",
    eventTypes: [
      "workspace.index.proposed",
      "workspace.index.built",
      "workspace.index.rejected",
      "workspace.file.summarized"
    ]
  };
}
