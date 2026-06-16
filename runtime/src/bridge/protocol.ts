import { randomUUID } from "node:crypto";

import { type BridgeMessageEnvelope, type BridgeMessageType } from "./types.js";

export function createBridgeEnvelope<TPayload>(
  type: BridgeMessageType,
  payload: TPayload,
  options: {
    messageId?: string | undefined;
    sentAt?: string | undefined;
    sessionId?: string | undefined;
    nonce?: string | undefined;
  } = {}
): BridgeMessageEnvelope<TPayload> {
  const envelope: BridgeMessageEnvelope<TPayload> = {
    schemaVersion: 1,
    messageId: options.messageId ?? randomUUID(),
    type,
    sentAt: options.sentAt ?? new Date().toISOString(),
    payload
  };
  if (options.sessionId !== undefined) {
    envelope.sessionId = options.sessionId;
  }
  if (options.nonce !== undefined) {
    envelope.nonce = options.nonce;
  }
  return envelope;
}

export function jsonByteLength(value: unknown): number {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    return 0;
  }
  return Buffer.byteLength(serialized, "utf8");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readOptionalString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}
