import { randomUUID } from "node:crypto";

import { BridgeProtocolError, bridgeError } from "./errors.js";
import { NonceStore } from "./nonce-store.js";
import {
  createPairingToken,
  fingerprintToken,
  hashPairingToken,
  tokensMatch
} from "./pairing.js";
import {
  createBridgeEnvelope,
  isRecord,
  readOptionalString
} from "./protocol.js";
import { validateBridgePayloadProposal } from "./validator.js";
import {
  type BridgeError,
  type BridgeMessageEnvelope,
  type BridgePairingChallenge,
  type BridgeSessionState,
  type BridgeValidationResult,
  type BridgeRiskSummary
} from "./types.js";

export type BridgeSessionOptions = {
  clock?: () => Date;
  idFactory?: () => string;
  tokenFactory?: () => string;
  pairingTtlMs?: number;
  sessionTtlMs?: number;
  maxPayloadBytes?: number;
  allowedExtensionIds?: readonly string[];
};

type PairingChallengeState = {
  challengeId: string;
  tokenHash: string;
  tokenFingerprint: string;
  expiresAtMs: number;
  used: boolean;
};

type EstablishedSession = {
  sessionId: string;
  expiresAtMs: number;
};

const defaultPairingTtlMs = 5 * 60 * 1000;
const defaultSessionTtlMs = 30 * 60 * 1000;
const defaultMaxPayloadBytes = 2_000_000;

export class BridgeSession {
  private readonly nonces = new NonceStore();
  private readonly clock: () => Date;
  private readonly idFactory: () => string;
  private readonly tokenFactory: () => string;
  private readonly pairingTtlMs: number;
  private readonly sessionTtlMs: number;
  private readonly maxPayloadBytes: number;
  private readonly allowedExtensionIds: readonly string[] | undefined;
  private pairing?: PairingChallengeState;
  private session?: EstablishedSession;
  private state: BridgeSessionState = "waiting_for_pairing";
  private lastRiskSummary?: BridgeRiskSummary;

  constructor(options: BridgeSessionOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => randomUUID());
    this.tokenFactory = options.tokenFactory ?? createPairingToken;
    this.pairingTtlMs = options.pairingTtlMs ?? defaultPairingTtlMs;
    this.sessionTtlMs = options.sessionTtlMs ?? defaultSessionTtlMs;
    this.maxPayloadBytes = options.maxPayloadBytes ?? defaultMaxPayloadBytes;
    this.allowedExtensionIds = options.allowedExtensionIds;
  }

  getState(): BridgeSessionState {
    return this.state;
  }

  getSessionId(): string | undefined {
    return this.session?.sessionId;
  }

  getLastRiskSummary(): BridgeRiskSummary | undefined {
    return this.lastRiskSummary;
  }

  handleEnvelope(envelope: BridgeMessageEnvelope): BridgeValidationResult {
    const envelopeError = this.validateEnvelope(envelope);
    if (envelopeError !== undefined) {
      return this.errorResult(envelope, envelopeError);
    }

    if (!this.nonces.useMessageId(envelope.messageId)) {
      return this.errorResult(
        envelope,
        bridgeError(
          "repeated_message_id",
          "Bridge messageId was already used",
          {
            stage: "envelope"
          }
        )
      );
    }

    try {
      switch (envelope.type) {
        case "pairing.request":
          return this.handlePairingRequest(envelope);
        case "pairing.confirm":
          return this.handlePairingConfirm(envelope);
        case "payload.proposed":
          return this.handlePayloadProposed(envelope);
        case "payload.accepted":
          return this.handlePreviewAccepted(envelope);
        case "payload.rejected":
          return this.handlePreviewRejected(envelope);
        case "session.closed":
          return this.handleSessionClosed(envelope);
        default:
          return this.errorResult(
            envelope,
            bridgeError(
              "unknown_message_type",
              "Bridge message type is unknown",
              {
                stage: "envelope"
              }
            )
          );
      }
    } catch (error) {
      if (error instanceof BridgeProtocolError) {
        return this.errorResult(envelope, errorToPayload(error));
      }
      return this.errorResult(
        envelope,
        bridgeError("internal_error", "Bridge dry harness failed safely", {
          stage: "transport"
        })
      );
    }
  }

  private handlePairingRequest(
    envelope: BridgeMessageEnvelope
  ): BridgeValidationResult {
    if (this.session !== undefined) {
      return this.errorResult(
        envelope,
        bridgeError(
          "pairing_already_established",
          "Bridge pairing is already established",
          { stage: "pairing" }
        )
      );
    }

    const token = this.tokenFactory();
    const now = this.nowMs();
    const challenge: BridgePairingChallenge = {
      challengeId: this.nextId("challenge"),
      pairingToken: token,
      tokenFingerprint: fingerprintToken(token),
      expiresAt: new Date(now + this.pairingTtlMs).toISOString(),
      ttlMs: this.pairingTtlMs,
      userActionRequired: true
    };
    this.pairing = {
      challengeId: challenge.challengeId,
      tokenHash: hashPairingToken(token),
      tokenFingerprint: challenge.tokenFingerprint,
      expiresAtMs: now + this.pairingTtlMs,
      used: false
    };
    this.state = "pairing_challenge_issued";

    return this.okResult(
      createBridgeEnvelope("pairing.challenge", challenge, {
        messageId: this.nextId("message"),
        sentAt: this.nowIso()
      })
    );
  }

  private handlePairingConfirm(
    envelope: BridgeMessageEnvelope
  ): BridgeValidationResult {
    if (!isRecord(envelope.payload)) {
      return this.errorResult(
        envelope,
        bridgeError(
          "invalid_envelope",
          "Bridge pairing confirmation payload is invalid",
          { stage: "pairing" }
        )
      );
    }
    const challengeId = readOptionalString(envelope.payload, "challengeId");
    const pairingToken = readOptionalString(envelope.payload, "pairingToken");
    if (challengeId === undefined || pairingToken === undefined) {
      return this.errorResult(
        envelope,
        bridgeError(
          "pairing_challenge_missing",
          "Bridge pairing confirmation is missing challenge data",
          { stage: "pairing" }
        )
      );
    }
    if (
      this.pairing === undefined ||
      this.pairing.challengeId !== challengeId
    ) {
      return this.errorResult(
        envelope,
        bridgeError(
          "pairing_challenge_missing",
          "Bridge pairing challenge is missing",
          {
            stage: "pairing"
          }
        )
      );
    }
    if (this.pairing.used) {
      return this.errorResult(
        envelope,
        bridgeError(
          "pairing_token_reused",
          "Bridge pairing token was already used",
          {
            stage: "pairing",
            tokenFingerprint: this.pairing.tokenFingerprint
          }
        )
      );
    }
    if (this.nowMs() > this.pairing.expiresAtMs) {
      return this.errorResult(
        envelope,
        bridgeError("pairing_token_expired", "Bridge pairing token expired", {
          stage: "pairing",
          tokenFingerprint: this.pairing.tokenFingerprint
        })
      );
    }
    if (!tokensMatch(pairingToken, this.pairing.tokenHash)) {
      return this.errorResult(
        envelope,
        bridgeError(
          "pairing_token_invalid",
          "Bridge pairing token was not valid",
          {
            stage: "pairing"
          }
        )
      );
    }

    this.pairing.used = true;
    this.session = {
      sessionId: this.nextId("session"),
      expiresAtMs: this.nowMs() + this.sessionTtlMs
    };
    this.state = "paired";

    return this.okResult(
      createBridgeEnvelope(
        "pairing.confirm",
        {
          sessionId: this.session.sessionId,
          expiresAt: new Date(this.session.expiresAtMs).toISOString()
        },
        {
          messageId: this.nextId("message"),
          sentAt: this.nowIso(),
          sessionId: this.session.sessionId
        }
      )
    );
  }

  private handlePayloadProposed(
    envelope: BridgeMessageEnvelope
  ): BridgeValidationResult {
    const sessionError = this.validateSessionMessage(envelope);
    if (sessionError !== undefined) {
      return this.errorResult(envelope, sessionError);
    }

    try {
      const riskSummary = validateBridgePayloadProposal(envelope.payload, {
        maxPayloadBytes: this.maxPayloadBytes,
        allowedExtensionIds: this.allowedExtensionIds
      });
      this.lastRiskSummary = riskSummary;
      this.state = "waiting_for_desktop_preview";
      return this.okResult(
        createBridgeEnvelope(
          "payload.accepted",
          {
            acceptedFor: "desktop_preview",
            riskSummary,
            autoConvert: false,
            fileWritten: false,
            eventWritten: false
          },
          {
            messageId: this.nextId("message"),
            sentAt: this.nowIso(),
            sessionId: this.session?.sessionId
          }
        ),
        riskSummary
      );
    } catch (error) {
      if (error instanceof BridgeProtocolError) {
        return this.errorResult(envelope, errorToPayload(error));
      }
      return this.errorResult(
        envelope,
        bridgeError("payload_invalid", "Bridge payload proposal is invalid", {
          stage: "payload"
        })
      );
    }
  }

  private handlePreviewAccepted(
    envelope: BridgeMessageEnvelope
  ): BridgeValidationResult {
    const sessionError = this.validateSessionMessage(envelope);
    if (sessionError !== undefined) {
      return this.errorResult(envelope, sessionError);
    }
    if (this.lastRiskSummary === undefined) {
      return this.errorResult(
        envelope,
        bridgeError(
          "payload_invalid",
          "No bridge payload proposal is waiting",
          {
            stage: "payload"
          }
        )
      );
    }
    this.state = "preview_accepted";
    return this.okResult(
      createBridgeEnvelope(
        "payload.accepted",
        {
          acceptedFor: "desktop_preview",
          riskSummary: this.lastRiskSummary,
          autoConvert: false,
          fileWritten: false,
          eventWritten: false
        },
        {
          messageId: this.nextId("message"),
          sentAt: this.nowIso(),
          sessionId: this.session?.sessionId
        }
      ),
      this.lastRiskSummary
    );
  }

  private handlePreviewRejected(
    envelope: BridgeMessageEnvelope
  ): BridgeValidationResult {
    const sessionError = this.validateSessionMessage(envelope);
    if (sessionError !== undefined) {
      return this.errorResult(envelope, sessionError);
    }
    this.state = "paired";
    return this.okResult(
      createBridgeEnvelope(
        "payload.rejected",
        {
          safeMessage:
            "Bridge payload proposal was rejected by desktop preview",
          autoConvert: false,
          fileWritten: false,
          eventWritten: false
        },
        {
          messageId: this.nextId("message"),
          sentAt: this.nowIso(),
          sessionId: this.session?.sessionId
        }
      )
    );
  }

  private handleSessionClosed(
    envelope: BridgeMessageEnvelope
  ): BridgeValidationResult {
    const sessionError = this.validateSessionMessage(envelope);
    if (sessionError !== undefined) {
      return this.errorResult(envelope, sessionError);
    }
    this.state = "closed";
    return this.okResult(
      createBridgeEnvelope(
        "session.closed",
        { safeMessage: "Bridge session closed" },
        {
          messageId: this.nextId("message"),
          sentAt: this.nowIso(),
          sessionId: this.session?.sessionId
        }
      )
    );
  }

  private validateSessionMessage(
    envelope: BridgeMessageEnvelope
  ): BridgeError | undefined {
    if (this.session === undefined) {
      return bridgeError("session_required", "Bridge session is required", {
        stage: "session"
      });
    }
    if (this.nowMs() > this.session.expiresAtMs) {
      return bridgeError("session_expired", "Bridge session expired", {
        stage: "session"
      });
    }
    if (envelope.sessionId !== this.session.sessionId) {
      return bridgeError("session_invalid", "Bridge session id is invalid", {
        stage: "session"
      });
    }
    if (typeof envelope.nonce !== "string" || envelope.nonce.length === 0) {
      return bridgeError(
        "nonce_required",
        "Bridge session message nonce is required",
        {
          stage: "session"
        }
      );
    }
    if (!this.nonces.useNonce(envelope.nonce)) {
      return bridgeError(
        "nonce_replayed",
        "Bridge session nonce was already used",
        {
          stage: "session"
        }
      );
    }
    return undefined;
  }

  private validateEnvelope(
    envelope: BridgeMessageEnvelope
  ): BridgeError | undefined {
    if (!isRecord(envelope)) {
      return bridgeError(
        "invalid_envelope",
        "Bridge envelope must be an object",
        {
          stage: "envelope"
        }
      );
    }
    if (envelope.schemaVersion !== 1) {
      return bridgeError(
        "unsupported_schema",
        "Bridge envelope schema is unsupported",
        {
          stage: "envelope"
        }
      );
    }
    if (
      typeof envelope.messageId !== "string" ||
      envelope.messageId.length === 0
    ) {
      return bridgeError(
        "invalid_envelope",
        "Bridge envelope messageId is required",
        {
          stage: "envelope"
        }
      );
    }
    if (typeof envelope.sentAt !== "string" || envelope.sentAt.length === 0) {
      return bridgeError(
        "invalid_envelope",
        "Bridge envelope sentAt is required",
        {
          stage: "envelope"
        }
      );
    }
    if (!isRecord(envelope.payload)) {
      return bridgeError(
        "invalid_envelope",
        "Bridge envelope payload is required",
        {
          stage: "envelope"
        }
      );
    }
    return undefined;
  }

  private okResult(
    envelope: BridgeMessageEnvelope,
    riskSummary?: BridgeRiskSummary
  ): BridgeValidationResult {
    const result: BridgeValidationResult = {
      ok: true,
      envelope,
      state: this.state
    };
    if (riskSummary !== undefined) {
      result.riskSummary = riskSummary;
    }
    return result;
  }

  private errorResult(
    request: BridgeMessageEnvelope,
    error: BridgeError
  ): BridgeValidationResult {
    return {
      ok: false,
      envelope: createBridgeEnvelope("error", error, {
        messageId: this.nextId("message"),
        sentAt: this.nowIso(),
        sessionId: request.sessionId
      }),
      error,
      state: this.state
    };
  }

  private nextId(prefix: string): string {
    return `${prefix}-${this.idFactory()}`;
  }

  private nowMs(): number {
    return this.clock().getTime();
  }

  private nowIso(): string {
    return this.clock().toISOString();
  }
}

function errorToPayload(error: BridgeProtocolError): BridgeError {
  const payload: BridgeError = {
    kind: error.kind,
    safeMessage: error.safeMessage,
    retryable: error.retryable,
    stage: error.stage
  };
  if (error.tokenFingerprint !== undefined) {
    payload.tokenFingerprint = error.tokenFingerprint;
  }
  return payload;
}
