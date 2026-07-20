export type ToolKind =
  | "read"
  | "convert"
  | "broker"
  | "verify"
  | "git"
  | "chat";

export type ToolState =
  | { phase: "needs_args"; prompt: string }
  | {
      phase: "awaiting_approval";
      reason: string;
      phrase: string;
      needsLease: boolean;
    }
  | { phase: "running" }
  | { phase: "done"; summary: string; detail?: string | undefined }
  | { phase: "error"; message: string };

export type ChatItem =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "assistant"; text: string }
  | {
      id: string;
      kind: "tool";
      tool: ToolKind;
      title: string;
      state: ToolState;
    };

export type LeaseOption = {
  leaseId: string;
  mode: string;
  status: string;
};
