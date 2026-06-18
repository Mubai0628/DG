import { type ControlPlaneError, type ControlPlaneErrorKind } from "./types.js";

export class ControlPlaneException extends Error {
  readonly error: ControlPlaneError;

  constructor(error: ControlPlaneError) {
    super(error.safeMessage);
    this.name = "ControlPlaneException";
    this.error = error;
  }
}

export function controlPlaneError(
  kind: ControlPlaneErrorKind,
  code: string,
  safeMessage: string,
  refs: {
    taskId?: string;
    runId?: string;
  } = {}
): ControlPlaneError {
  const error: ControlPlaneError = {
    kind,
    code,
    safeMessage
  };
  if (refs.taskId !== undefined) {
    error.taskId = refs.taskId;
  }
  if (refs.runId !== undefined) {
    error.runId = refs.runId;
  }
  return error;
}
