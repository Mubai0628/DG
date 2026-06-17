import { type CapabilityDescriptor } from "./types.js";

export function createNativeFsWriteDraftDescriptor(): CapabilityDescriptor {
  return {
    id: "native.fs.write_draft",
    title: "Write CSV draft",
    sourceType: "native",
    category: "fs",
    riskLevel: "A2_draft_write",
    invokePolicy: "ASK_FIRST",
    executionMode: "MUTATING",
    inputSchema: {
      type: "object",
      required: ["filename", "content", "contentType"]
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
      "Descriptor for the existing fs.write_draft ToolBroker v0 capability. Capability Broker v2 only plans this capability and does not execute it.",
    eventTypes: [
      "capability.invocation.proposed",
      "capability.invocation.planned",
      "capability.invocation.rejected"
    ]
  };
}
