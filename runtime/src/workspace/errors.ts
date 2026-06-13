import { type WorkspaceFsErrorKind } from "./types.js";

export class WorkspaceFsError extends Error {
  readonly kind: WorkspaceFsErrorKind;

  constructor(kind: WorkspaceFsErrorKind, message: string) {
    super(message);
    this.name = "WorkspaceFsError";
    this.kind = kind;
  }
}
