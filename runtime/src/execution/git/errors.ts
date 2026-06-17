import { type GitSafeLaneErrorKind } from "./types.js";

export class GitSafeLaneException extends Error {
  readonly kind: GitSafeLaneErrorKind;
  readonly code: string;

  constructor(input: {
    kind: GitSafeLaneErrorKind;
    code: string;
    safeMessage: string;
  }) {
    super(input.safeMessage);
    this.name = "GitSafeLaneException";
    this.kind = input.kind;
    this.code = input.code;
  }
}
