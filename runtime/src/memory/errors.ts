import { type MemoryError } from "./types.js";

export class MemoryCoreException extends Error {
  readonly detail: MemoryError;

  constructor(detail: MemoryError) {
    super(detail.safeMessage);
    this.name = "MemoryCoreException";
    this.detail = detail;
  }
}
