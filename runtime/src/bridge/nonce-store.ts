export class NonceStore {
  private readonly messageIds = new Set<string>();
  private readonly nonces = new Set<string>();

  useMessageId(messageId: string): boolean {
    if (this.messageIds.has(messageId)) {
      return false;
    }
    this.messageIds.add(messageId);
    return true;
  }

  useNonce(nonce: string): boolean {
    if (this.nonces.has(nonce)) {
      return false;
    }
    this.nonces.add(nonce);
    return true;
  }
}
