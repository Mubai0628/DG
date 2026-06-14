import { type WebExtractionErrorKind } from "./types.js";

export class WebExtractionError extends Error {
  readonly kind: WebExtractionErrorKind;

  constructor(kind: WebExtractionErrorKind, message: string) {
    super(message);
    this.name = "WebExtractionError";
    this.kind = kind;
  }
}

export class BrowserPayloadValidationError extends WebExtractionError {
  constructor(kind: WebExtractionErrorKind, message: string) {
    super(kind, message);
    this.name = "BrowserPayloadValidationError";
  }
}
