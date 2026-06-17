import { type AgentMemoryRef } from "../agents/index.js";
import { type ContextSegmentV2Input } from "../context/index.js";

import {
  type MemoryDossierSummary,
  type MemoryRecallResult,
  type MemoryStore,
  type MemorySummary
} from "./types.js";

export function memoryRecallToContextSegments(
  recall: MemoryRecallResult
): ContextSegmentV2Input[] {
  return recall.items.map((item) => {
    const contentParts = [`${item.type}: ${item.summary}`];
    if (item.trigger !== undefined) {
      contentParts.push(`trigger: ${item.trigger}`);
    }
    if (item.mitigation !== undefined) {
      contentParts.push(`mitigation: ${item.mitigation}`);
    }

    return {
      id: `memory-recall:${item.memoryId}`,
      layer: "volatile_tail",
      title: `Memory recall ${item.memoryId}`,
      content: contentParts.join("\n"),
      source: "memory_recall",
      priority: Math.round(item.score * 1_000),
      provenance: {
        memoryId: item.memoryId,
        provenanceRefs: item.provenanceRefs,
        volatilePlacement: true
      },
      sensitivity: "internal",
      placement: "volatile_tail"
    };
  });
}

export function summarizeMemoryRefsForDossier(
  memoryIds: readonly string[],
  store: Pick<MemoryStore, "summarizeMemory">
): MemoryDossierSummary {
  const summaries: MemorySummary[] = [];
  const refs: AgentMemoryRef[] = [];
  for (const memoryId of memoryIds) {
    const summary = store.summarizeMemory(memoryId);
    if (summary === undefined) {
      continue;
    }
    refs.push({ id: memoryId, kind: "memory_ref" });
    summaries.push(summary);
  }
  return {
    memoryRefs: refs,
    summaries
  };
}
