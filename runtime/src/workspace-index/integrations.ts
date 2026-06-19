import { type AgentEvidenceRef } from "../agents/index.js";
import { type ContextSegmentV2Input } from "../context/index.js";
import { type ControlPlaneEvidenceRef } from "../control-plane/index.js";
import { createNativeWorkspaceIndexDescriptor } from "./capability-descriptor.js";
import {
  type WorkspaceIndex,
  type WorkspaceIndexRef,
  type WorkspaceIndexIntegrationRefs
} from "./types.js";

export function workspaceIndexToContextSegments(
  index: WorkspaceIndex
): ContextSegmentV2Input[] {
  return [
    {
      id: `workspace-index:${index.workspaceIndexId}`,
      layer: "volatile_tail",
      title: "Workspace index summary",
      content: summarizeWorkspaceIndex(index),
      source: "workspace_file",
      priority: 0,
      provenance: {
        workspaceIndexId: index.workspaceIndexId,
        hash: index.hash,
        volatilePlacement: true
      },
      sensitivity: "internal",
      placement: "volatile_tail"
    }
  ];
}

export function workspaceIndexToAgentEvidenceRefs(
  index: WorkspaceIndex
): AgentEvidenceRef[] {
  const refs: AgentEvidenceRef[] = [
    {
      id: index.workspaceIndexId,
      kind: "artifact",
      untrusted: false,
      summary: summarizeWorkspaceIndex(index)
    }
  ];

  for (const file of index.files.slice(0, 50)) {
    refs.push({
      id: `workspace-file:${file.path}`,
      kind: "artifact",
      untrusted: false,
      summary: `Workspace file ${file.path}: ${file.summary.language}, lines=${file.summary.lineCount}, symbols=${file.summary.symbolCount}`
    });
  }

  for (const directory of index.directories
    .filter((item) => item.path !== ".")
    .slice(0, 25)) {
    refs.push({
      id: `workspace-directory:${directory.path}`,
      kind: "artifact",
      untrusted: false,
      summary: `Workspace directory ${directory.path}: files=${directory.fileCount}, indexed=${directory.indexedFileCount}`
    });
  }

  return refs;
}

export function workspaceIndexToControlRef(
  index: WorkspaceIndex
): WorkspaceIndexRef {
  return {
    workspaceIndexId: index.workspaceIndexId,
    fileCount: index.fileCount,
    indexedFileCount: index.indexedFileCount,
    skippedFileCount: index.skippedFileCount,
    languageSummary: index.languageSummary,
    warningCount: index.warningCodes.length,
    hash: index.hash
  };
}

export function workspaceIndexToControlEvidenceRef(
  index: WorkspaceIndex
): ControlPlaneEvidenceRef {
  return {
    id: index.workspaceIndexId,
    kind: "summary",
    summary: summarizeWorkspaceIndex(index)
  };
}

export function createWorkspaceIndexIntegrationRefs(
  index: WorkspaceIndex
): WorkspaceIndexIntegrationRefs {
  return {
    contextSegments: workspaceIndexToContextSegments(index),
    evidenceRefs: workspaceIndexToAgentEvidenceRefs(index),
    controlRef: workspaceIndexToControlRef(index),
    descriptor: createNativeWorkspaceIndexDescriptor()
  };
}

export function summarizeWorkspaceIndex(index: WorkspaceIndex): string {
  const languages = index.languageSummary
    .map((item) => `${item.language}:${item.fileCount}`)
    .join(",");
  return `Workspace index ${index.status}: files=${index.fileCount}, indexed=${index.indexedFileCount}, skipped=${index.skippedFileCount}, languages=${languages || "none"}, warnings=${index.warningCodes.length}, hash=${index.hash.slice(0, 12)}`;
}
