import { type AgentMemoryRef } from "../agents/index.js";
import { type ContextSegmentV2Input } from "../context/index.js";
import { type EventStore } from "../events/index.js";

export type MemoryType = "policy" | "project_fact" | "pitfall";

export type MemoryStatus =
  | "candidate"
  | "committed"
  | "rejected"
  | "expired"
  | "revoked";

export type MemoryTrustLevel =
  | "explicit_user"
  | "approval_record"
  | "repository_rule"
  | "workspace_rule"
  | "verified_tool_result"
  | "eval_failure"
  | "user_correction"
  | "model_suggested"
  | "external_untrusted";

export type MemorySource =
  | "user"
  | "approval"
  | "repository"
  | "workspace"
  | "tool_result"
  | "eval"
  | "model"
  | "browser"
  | "mcp"
  | "plugin"
  | "bridge"
  | "unknown";

export type MemoryNamespace = string;

export type MemoryScope = {
  kind: "global" | "workspace" | "project" | "task";
  id?: string;
};

export type MemorySensitivity =
  | "public"
  | "internal"
  | "sensitive"
  | "secret_blocked";

export type MemoryProvenance = {
  source: MemorySource;
  sourceId?: string;
  actor?: string;
  refs: string[];
};

export type MemoryRecord = {
  memoryId: string;
  type: MemoryType;
  namespace: MemoryNamespace;
  scope: MemoryScope;
  content: string;
  summary: string;
  trigger?: string;
  mitigation?: string;
  provenance: MemoryProvenance;
  trustLevel: MemoryTrustLevel;
  status: MemoryStatus;
  pinned: boolean;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  supersedes?: string[];
  supersededBy?: string;
  tags: string[];
  evidenceRefs: string[];
  contextRefs: string[];
  agentRefs: string[];
  hash: string;
  sensitivity: MemorySensitivity;
};

export type MemoryCandidate = {
  candidateId: string;
  proposedType: MemoryType | string;
  proposedContent: string;
  proposedSummary: string;
  proposedBy: string;
  source: MemorySource | string;
  trustLevel: MemoryTrustLevel | string;
  namespace: MemoryNamespace;
  scope: MemoryScope;
  trigger?: string;
  mitigation?: string;
  evidenceRefs: string[];
  contextRefs: string[];
  agentRefs?: string[];
  reason: string;
  createdAt: string;
  expiresAt?: string;
  tags?: string[];
  pinned?: boolean;
  sensitivity: MemorySensitivity;
  provenance?: MemoryProvenance;
};

export type MemoryCommitDecisionStatus =
  | "approved"
  | "rejected"
  | "approval_required";

export type MemoryWarning = {
  code: string;
  safeMessage: string;
};

export type MemoryCommitDecision = {
  status: MemoryCommitDecisionStatus;
  candidateId: string;
  proposedType?: MemoryType;
  reasonCodes: string[];
  warnings: MemoryWarning[];
  safeMessage: string;
};

export type MemoryCommitGateOptions = {
  existingMemories?: readonly MemoryRecord[];
  maxContentChars?: number;
  allowSensitiveContent?: boolean;
};

export type MemoryWritePolicy = {
  maxContentChars: number;
  allowSensitiveContent: boolean;
};

export type MemoryCommitGate = {
  evaluate(candidate: MemoryCandidate): MemoryCommitDecision;
};

export type MemoryRecallQuery = {
  namespace: MemoryNamespace;
  scope?: MemoryScope;
  types?: MemoryType[];
  text?: string;
  tags?: string[];
  trustLevels?: MemoryTrustLevel[];
  statuses?: MemoryStatus[];
  includeExpired?: boolean;
  maxResults?: number;
  now?: string | Date;
};

export type MemoryRecallItem = {
  memoryId: string;
  type: MemoryType;
  summary: string;
  trigger?: string;
  mitigation?: string;
  score: number;
  provenanceRefs: string[];
  trustLevel: MemoryTrustLevel;
  namespace: MemoryNamespace;
  tags: string[];
  volatilePlacement: true;
};

export type MemoryRecallResult = {
  querySummary: {
    namespace: MemoryNamespace;
    typeCount: number;
    tagCount: number;
    maxResults: number;
  };
  items: MemoryRecallItem[];
  warnings: MemoryWarning[];
};

export type MemoryStoreOptions = {
  eventStore?: EventStore;
  clock?: () => Date;
  candidateIdFactory?: () => string;
  memoryIdFactory?: () => string;
  maxContentChars?: number;
};

export type MemoryStore = {
  putCandidate(candidate: MemoryCandidate): MemoryCandidate;
  commitCandidate(
    candidateId: string,
    decision?: MemoryCommitDecision
  ): MemoryRecord;
  getMemory(memoryId: string): MemoryRecord | undefined;
  listMemories(): MemoryRecord[];
  revokeMemory(memoryId: string, reason: string): MemoryRecord;
  expireMemory(memoryId: string, now?: string | Date): MemoryRecord;
  recallMemories(query: MemoryRecallQuery): MemoryRecallResult;
  summarizeMemory(memoryId: string): MemorySummary | undefined;
};

export type MemorySummary = {
  memoryId: string;
  type: MemoryType;
  namespace: MemoryNamespace;
  scope: MemoryScope;
  summary: string;
  trustLevel: MemoryTrustLevel;
  status: MemoryStatus;
  pinned: boolean;
  tags: string[];
  evidenceRefs: string[];
  contextRefs: string[];
  agentRefs: string[];
  hash: string;
};

export type MemoryContextSegmentResult = {
  segments: ContextSegmentV2Input[];
  warnings: MemoryWarning[];
};

export type MemoryDossierSummary = {
  memoryRefs: AgentMemoryRef[];
  summaries: MemorySummary[];
};

export type MemoryErrorKind =
  | "candidate_rejected"
  | "candidate_not_found"
  | "memory_not_found"
  | "memory_not_committed"
  | "invalid_memory";

export type MemoryError = {
  kind: MemoryErrorKind;
  code: string;
  safeMessage: string;
  memoryId?: string;
  candidateId?: string;
};
