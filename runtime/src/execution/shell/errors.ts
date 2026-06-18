import {
  type ShellAllowlistErrorKind,
  type ShellAllowlistIssue
} from "./types.js";

export function shellIssue(
  kind: ShellAllowlistErrorKind,
  safeMessage: string,
  input: {
    commandId?: string;
    value?: string;
    code?: string;
  } = {}
): ShellAllowlistIssue {
  const issue: ShellAllowlistIssue = {
    kind,
    code: input.code ?? kind,
    safeMessage
  };
  if (input.commandId !== undefined) {
    issue.commandId = input.commandId;
  }
  if (input.value !== undefined) {
    issue.value = input.value;
  }
  return issue;
}
