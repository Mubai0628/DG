import { describe, expect, it } from "vitest";

import {
  currentTaskId,
  getRuntimeSkeletonStatus,
  nextTaskId,
  projectName,
  releaseScope
} from "../src/index.js";

describe("runtime skeleton", () => {
  it("exports the project and task boundaries", () => {
    const status = getRuntimeSkeletonStatus();

    expect(projectName).toBe("deepseek-workbench");
    expect(releaseScope).toBe("v0.1.0");
    expect(currentTaskId).toBe("DW-P0A-001");
    expect(nextTaskId).toBe("DW-P0A-002");
    expect(status.disabledUntilLaterTasks).toContain("real DeepSeek API calls");
    expect(status.disabledUntilLaterTasks).toContain("desktop control");
  });
});
