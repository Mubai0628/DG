import { BridgeSession, type BridgeSessionOptions } from "./bridge-session.js";
import { createBridgeEnvelope } from "./protocol.js";
import {
  type BridgeMessageEnvelope,
  type BridgePairingChallenge,
  type BridgePayloadProposal,
  type BridgeSessionState,
  type BridgeTransport,
  type BridgeValidationResult
} from "./types.js";

export class FakeBridgeTransport implements BridgeTransport {
  readonly session: BridgeSession;

  constructor(options: BridgeSessionOptions = {}) {
    this.session = new BridgeSession(options);
  }

  send(envelope: BridgeMessageEnvelope): BridgeValidationResult {
    return this.session.handleEnvelope(envelope);
  }

  getState(): BridgeSessionState {
    return this.session.getState();
  }

  sendPairingRequest(
    payload: Record<string, unknown> = {},
    messageId = "pairing-request"
  ): BridgeValidationResult {
    return this.send(
      createBridgeEnvelope("pairing.request", payload, { messageId })
    );
  }

  confirmPairing(
    challenge: BridgePairingChallenge,
    options: {
      pairingToken?: string;
      messageId?: string;
      extensionId?: string;
      extensionVersion?: string;
    } = {}
  ): BridgeValidationResult {
    const payload: Record<string, unknown> = {
      challengeId: challenge.challengeId,
      pairingToken: options.pairingToken ?? challenge.pairingToken
    };
    if (options.extensionId !== undefined) {
      payload.extensionId = options.extensionId;
    }
    if (options.extensionVersion !== undefined) {
      payload.extensionVersion = options.extensionVersion;
    }
    return this.send(
      createBridgeEnvelope("pairing.confirm", payload, {
        messageId: options.messageId ?? "pairing-confirm"
      })
    );
  }

  proposePayload(
    proposal: BridgePayloadProposal,
    options: { messageId?: string; nonce?: string; sessionId?: string } = {}
  ): BridgeValidationResult {
    const sessionId = options.sessionId ?? this.session.getSessionId();
    return this.send(
      createBridgeEnvelope("payload.proposed", proposal, {
        messageId: options.messageId ?? "payload-proposed",
        nonce: options.nonce ?? "nonce-payload",
        sessionId
      })
    );
  }

  acceptPreview(
    options: { messageId?: string; nonce?: string; sessionId?: string } = {}
  ): BridgeValidationResult {
    return this.send(
      createBridgeEnvelope(
        "payload.accepted",
        { acceptedFor: "desktop_preview" },
        {
          messageId: options.messageId ?? "payload-accepted",
          nonce: options.nonce ?? "nonce-accepted",
          sessionId: options.sessionId ?? this.session.getSessionId()
        }
      )
    );
  }

  rejectPreview(
    options: { messageId?: string; nonce?: string; sessionId?: string } = {}
  ): BridgeValidationResult {
    return this.send(
      createBridgeEnvelope(
        "payload.rejected",
        { safeMessage: "Rejected by desktop dry harness" },
        {
          messageId: options.messageId ?? "payload-rejected",
          nonce: options.nonce ?? "nonce-rejected",
          sessionId: options.sessionId ?? this.session.getSessionId()
        }
      )
    );
  }
}
