import { type BrowserDomPayload } from "../web/types.js";

export type BridgeProtocolVersion = 1;

export type BridgeMessageType =
  | "pairing.request"
  | "pairing.challenge"
  | "pairing.confirm"
  | "payload.proposed"
  | "payload.accepted"
  | "payload.rejected"
  | "session.closed"
  | "error";

export type BridgeMessageEnvelope<TPayload = Record<string, unknown>> = {
  schemaVersion: BridgeProtocolVersion;
  messageId: string;
  type: BridgeMessageType;
  sentAt: string;
  sessionId?: string;
  nonce?: string;
  payload: TPayload;
};

export type BridgePairingRequest = {
  extensionId?: string;
  extensionVersion?: string;
  sourceOrigin?: string;
  userGesture?: boolean;
};

export type BridgePairingChallenge = {
  challengeId: string;
  pairingToken: string;
  tokenFingerprint: string;
  expiresAt: string;
  ttlMs: number;
  userActionRequired: true;
};

export type BridgePairingConfirmation = {
  challengeId: string;
  pairingToken: string;
  extensionId?: string;
  extensionVersion?: string;
};

export type BridgePayloadProposal = {
  payload: BrowserDomPayload;
  extensionId?: string;
  extensionVersion?: string;
  sourceOrigin?: string;
};

export type BridgeRiskSummary = {
  sourceHost: string;
  sourcePathWithoutQuery: string;
  tableCount: number;
  selectedTableId: string;
  rowCount: number;
  columnCount: number;
  warningCount: number;
  injectionRiskCount: number;
  warningCodes: string[];
  injectionRiskHashes: string[];
  payloadBytes: number;
  identityWarnings: string[];
  previewRequired: true;
  autoConvert: false;
  fileWritten: false;
  eventWritten: false;
  extensionId?: string;
  extensionVersion?: string;
  sourceOrigin?: string;
};

export type BridgePayloadAck = {
  acceptedFor: "desktop_preview";
  riskSummary: BridgeRiskSummary;
  autoConvert: false;
  fileWritten: false;
  eventWritten: false;
};

export type BridgeErrorKind =
  | "invalid_envelope"
  | "unsupported_schema"
  | "unknown_message_type"
  | "repeated_message_id"
  | "pairing_required"
  | "pairing_already_established"
  | "pairing_challenge_missing"
  | "pairing_token_invalid"
  | "pairing_token_expired"
  | "pairing_token_reused"
  | "session_required"
  | "session_invalid"
  | "session_expired"
  | "nonce_required"
  | "nonce_replayed"
  | "payload_too_large"
  | "payload_invalid"
  | "payload_replayed"
  | "internal_error";

export type BridgeError = {
  kind: BridgeErrorKind;
  safeMessage: string;
  retryable: boolean;
  stage: "envelope" | "pairing" | "session" | "payload" | "transport";
  tokenFingerprint?: string;
};

export type BridgeSessionState =
  | "waiting_for_pairing"
  | "pairing_challenge_issued"
  | "paired"
  | "waiting_for_desktop_preview"
  | "preview_accepted"
  | "closed";

export type BridgeValidationResult =
  | {
      ok: true;
      envelope: BridgeMessageEnvelope;
      state: BridgeSessionState;
      riskSummary?: BridgeRiskSummary;
    }
  | {
      ok: false;
      envelope: BridgeMessageEnvelope<BridgeError>;
      error: BridgeError;
      state: BridgeSessionState;
    };

export type BridgeTransport = {
  send(envelope: BridgeMessageEnvelope): BridgeValidationResult;
  getState(): BridgeSessionState;
};
