import { type AgentRoutingError } from "./types.js";

export class AgentRoutingException extends Error {
  readonly code: string;

  constructor(error: AgentRoutingError) {
    super(error.safeMessage);
    this.name = "AgentRoutingException";
    this.code = error.code;
  }
}
