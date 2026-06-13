import {
  type ConversationTurnId,
  type ReasoningContentStore
} from "./types.js";

export class InMemoryReasoningContentStore implements ReasoningContentStore {
  private readonly reasoningByTurn = new Map<ConversationTurnId, string>();

  put(turnId: ConversationTurnId, reasoningContent: string): void {
    this.reasoningByTurn.set(turnId, reasoningContent);
  }

  get(turnId: ConversationTurnId): string | undefined {
    return this.reasoningByTurn.get(turnId);
  }

  has(turnId: ConversationTurnId): boolean {
    return this.reasoningByTurn.has(turnId);
  }

  listTurnIds(): ConversationTurnId[] {
    return [...this.reasoningByTurn.keys()];
  }

  clear(): void {
    this.reasoningByTurn.clear();
  }
}
