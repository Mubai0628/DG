import { type ToolDefinitionRuntime } from "./types.js";

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinitionRuntime>();

  register(definition: ToolDefinitionRuntime): void {
    this.tools.set(definition.name, definition);
  }

  get(name: string): ToolDefinitionRuntime | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinitionRuntime[] {
    return [...this.tools.values()];
  }
}
