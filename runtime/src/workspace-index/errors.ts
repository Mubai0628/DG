import {
  type WorkspaceIndexError,
  type WorkspaceIndexErrorKind,
  type WorkspaceIndexWarning
} from "./types.js";

export function workspaceIndexError(input: {
  kind: WorkspaceIndexErrorKind;
  code: string;
  path?: string;
  safeMessage?: string;
}): WorkspaceIndexError {
  const error: WorkspaceIndexError = {
    kind: input.kind,
    code: input.code,
    safeMessage:
      input.safeMessage ?? `Workspace index rejected item: ${input.code}`
  };
  if (input.path !== undefined) {
    error.path = input.path;
  }
  return error;
}

export function workspaceIndexWarning(input: {
  code: string;
  path?: string;
  safeMessage?: string;
}): WorkspaceIndexWarning {
  const warning: WorkspaceIndexWarning = {
    code: input.code,
    safeMessage: input.safeMessage ?? `Workspace index warning: ${input.code}`
  };
  if (input.path !== undefined) {
    warning.path = input.path;
  }
  return warning;
}
