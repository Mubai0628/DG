import { type ToolBrokerErrorKind } from "./types.js";

export class ToolBrokerError extends Error {
  readonly kind: ToolBrokerErrorKind;

  constructor(kind: ToolBrokerErrorKind, message: string) {
    super(message);
    this.name = "ToolBrokerError";
    this.kind = kind;
  }
}
