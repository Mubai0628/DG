import {
  type BridgeError,
  type BridgeErrorKind,
  type BridgeValidationResult
} from "./types.js";

export class BridgeProtocolError extends Error {
  readonly kind: BridgeErrorKind;
  readonly safeMessage: string;
  readonly retryable: boolean;
  readonly stage: BridgeError["stage"];
  readonly tokenFingerprint?: string;

  constructor(error: BridgeError) {
    super(error.safeMessage);
    this.name = "BridgeProtocolError";
    this.kind = error.kind;
    this.safeMessage = error.safeMessage;
    this.retryable = error.retryable;
    this.stage = error.stage;
    if (error.tokenFingerprint !== undefined) {
      this.tokenFingerprint = error.tokenFingerprint;
    }
  }
}

export function bridgeError(
  kind: BridgeErrorKind,
  safeMessage: string,
  options: {
    retryable?: boolean;
    stage?: BridgeError["stage"];
    tokenFingerprint?: string;
  } = {}
): BridgeError {
  const error: BridgeError = {
    kind,
    safeMessage,
    retryable: options.retryable ?? false,
    stage: options.stage ?? "transport"
  };
  if (options.tokenFingerprint !== undefined) {
    error.tokenFingerprint = options.tokenFingerprint;
  }
  return error;
}

export function bridgeErrorResult(
  envelope: BridgeValidationResult["envelope"],
  error: BridgeError,
  state: BridgeValidationResult["state"]
): BridgeValidationResult {
  return {
    ok: false,
    envelope: {
      schemaVersion: 1,
      messageId: `${envelope.messageId}:error`,
      type: "error",
      sentAt: new Date().toISOString(),
      payload: error
    },
    error,
    state
  };
}
