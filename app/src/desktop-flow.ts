import {
  safeErrorMessage,
  validateDesktopFlowInput,
  type DesktopFlowInput,
  type DesktopFlowResult
} from "./safety.js";

export type TauriInvoke = <T>(
  command: string,
  args?: Record<string, unknown>
) => Promise<T>;

export const allowedDesktopCommands = [
  "get_app_version",
  "run_web_table_to_csv_flow"
] as const;

export type AllowedDesktopCommand = (typeof allowedDesktopCommands)[number];

export function isAllowedDesktopCommand(
  command: string
): command is AllowedDesktopCommand {
  return allowedDesktopCommands.includes(command as AllowedDesktopCommand);
}

export async function runDesktopWebTableToCsvFlow(
  input: DesktopFlowInput,
  invokeImpl?: TauriInvoke
): Promise<DesktopFlowResult> {
  const validation = validateDesktopFlowInput(input);
  if (!validation.ok) {
    throw new Error(validation.errorMessage);
  }

  return invokeAllowedCommand<DesktopFlowResult>(
    "run_web_table_to_csv_flow",
    validation.request,
    invokeImpl
  );
}

export async function getDesktopAppVersion(
  invokeImpl?: TauriInvoke
): Promise<string> {
  return invokeAllowedCommand<string>("get_app_version", {}, invokeImpl);
}

export async function invokeAllowedCommand<T>(
  command: string,
  args: Record<string, unknown>,
  invokeImpl?: TauriInvoke
): Promise<T> {
  if (!isAllowedDesktopCommand(command)) {
    throw new Error("Desktop command is not allowed");
  }

  const invoke = invokeImpl ?? (await import("@tauri-apps/api/core")).invoke;
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new Error(safeErrorMessage(error), { cause: error });
  }
}
