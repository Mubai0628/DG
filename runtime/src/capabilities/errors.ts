import {
  type CapabilityBrokerError,
  type CapabilityBrokerErrorKind
} from "./types.js";

export class CapabilityBrokerException extends Error {
  readonly kind: CapabilityBrokerErrorKind;
  readonly code: string;
  readonly capabilityId: string | undefined;

  constructor(error: CapabilityBrokerError) {
    super(error.safeMessage);
    this.name = "CapabilityBrokerException";
    this.kind = error.kind;
    this.code = error.code;
    this.capabilityId = error.capabilityId;
  }
}

export function capabilityError(
  input: CapabilityBrokerError
): CapabilityBrokerError {
  const error: CapabilityBrokerError = {
    kind: input.kind,
    code: input.code,
    safeMessage: input.safeMessage
  };
  if (input.capabilityId !== undefined) {
    error.capabilityId = input.capabilityId;
  }
  return error;
}
