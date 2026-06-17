import { type PatchValidationErrorKind } from "./types.js";

export type PatchAuditErrorKind =
  | "invalid_path"
  | "invalid_content"
  | "invalid_operation"
  | "simulation_failed"
  | "rollback_failed";

export class PatchAuditException extends Error {
  readonly kind: PatchAuditErrorKind;
  readonly code: PatchValidationErrorKind | string;

  constructor(input: {
    kind: PatchAuditErrorKind;
    code: PatchValidationErrorKind | string;
    safeMessage: string;
  }) {
    super(input.safeMessage);
    this.name = "PatchAuditException";
    this.kind = input.kind;
    this.code = input.code;
  }
}
