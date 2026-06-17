import { type AgentRole } from "./types.js";

export const agentRoles: readonly AgentRole[] = [
  "orchestrator",
  "coder",
  "reviewer",
  "verifier"
];

export const defaultAgentModelProfileByRole: Record<AgentRole, string> = {
  orchestrator: "deepseek-v4-pro",
  coder: "deepseek-v4-pro",
  reviewer: "deepseek-v4-pro",
  verifier: "deepseek-v4-flash"
};

export function isAgentRole(value: string): value is AgentRole {
  return (agentRoles as readonly string[]).includes(value);
}
