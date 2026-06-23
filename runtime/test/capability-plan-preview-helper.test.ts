import { describe, expect, it } from "vitest";

import {
  buildCapabilityPlanPreview,
  summarizeCapabilityPlanPreview,
  validateCapabilityPlanPreviewInput,
  type CapabilityPlanPreviewInput,
  type CapabilityPlanPreviewIntent
} from "../src/index.js";

const createdAt = "2026-01-01T00:00:00.000Z";

function previewFor(intent: CapabilityPlanPreviewIntent) {
  return buildCapabilityPlanPreview({
    intent,
    routePreview: {
      routeId: `route-${intent}`,
      status: "preview",
      roleRefs: ["orchestrator", "coder", "reviewer", "verifier"],
      routeStepRefs: [
        "route-1-orchestrator",
        "route-2-coder",
        "route-3-reviewer",
        "route-4-verifier"
      ]
    },
    runDraftSummary: `summary for ${intent}`,
    createdAt
  });
}

describe("runtime capability plan preview helper", () => {
  it("returns empty until a route and intent are available", () => {
    const preview = buildCapabilityPlanPreview();

    expect(preview.status).toBe("empty");
    expect(preview.itemCount).toBe(0);
    expect(preview.executionEnabled).toBe(false);
    expect(preview.leaseIssued).toBe(false);
    expect(preview.source).toBe("runtime_capability_broker_preview");
  });

  it("maps web data extraction to workspace index and draft write refs", () => {
    const preview = previewFor("web_data_extraction");
    const ids = preview.items.map((item) => item.capabilityId);

    expect(ids).toEqual(["native.workspace.index", "native.fs.write_draft"]);
    expect(
      preview.items.find(
        (item) => item.capabilityId === "native.workspace.index"
      )?.planStatus
    ).toBe("display_only");
    expect(
      preview.items.find(
        (item) => item.capabilityId === "native.fs.write_draft"
      )?.planStatus
    ).toBe("approval_required");
    expect(preview.approvalRequiredCount).toBe(1);
    expect(preview.leaseRequiredCount).toBe(1);
  });

  it("maps code changes to workspace, patch, git, and disabled command refs", () => {
    const preview = previewFor("code_change");
    const ids = preview.items.map((item) => item.capabilityId);

    expect(ids).toEqual([
      "native.workspace.index",
      "native.patch.propose",
      "native.git.diff_summary",
      "native.git.status",
      "native.shell.pnpm_test",
      "native.patch.apply",
      "native.git.commit_draft"
    ]);
    expect(
      preview.items.find((item) => item.capabilityId === "native.patch.apply")
        ?.planStatus
    ).toBe("disabled");
    expect(
      preview.items.find(
        (item) => item.capabilityId === "native.git.commit_draft"
      )?.planStatus
    ).toBe("disabled");
    expect(
      preview.items.find(
        (item) => item.capabilityId === "native.shell.pnpm_test"
      )?.invokePolicy
    ).toBe("DISABLED");
    expect(preview.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining([
        "PATCH_APPLY_DISABLED",
        "GIT_WRITE_DISABLED",
        "SHELL_EXECUTION_DISABLED"
      ])
    );
  });

  it("returns needs clarification for unknown intent", () => {
    const preview = previewFor("unknown");

    expect(preview.status).toBe("needs_clarification");
    expect(preview.itemCount).toBe(0);
    expect(preview.warnings.map((warning) => warning.code)).toContain(
      "INTENT_UNKNOWN_NEEDS_CLARIFICATION"
    );
  });

  it("keeps high-risk and mutating refs disabled or approval-only with no AUTO policy", () => {
    const preview = previewFor("code_change");
    const highRiskOrMutating = preview.items.filter(
      (item) =>
        item.riskLevel === "A3_scoped_write" ||
        item.riskLevel === "A4_external_effect" ||
        item.executionMode === "MUTATING"
    );

    expect(highRiskOrMutating.length).toBeGreaterThan(0);
    expect(
      highRiskOrMutating.every((item) => item.invokePolicy !== "AUTO")
    ).toBe(true);
    expect(
      highRiskOrMutating.every((item) =>
        ["approval_required", "disabled", "unavailable", "blocked"].includes(
          item.planStatus
        )
      )
    ).toBe(true);
  });

  it("does not issue leases or write events", () => {
    const preview = previewFor("web_data_extraction");
    const serialized = JSON.stringify(preview);

    expect(preview.leaseRequiredCount).toBe(1);
    expect(preview.leaseIssued).toBe(false);
    expect(serialized).not.toContain("leaseId");
    expect(serialized).not.toContain("eventId");
    expect(serialized).not.toContain("eventIds");
  });

  it("blocks raw arguments and unsafe markers without retaining raw args or API key", () => {
    const secret = "sk-test1234567890abcdef";
    const unsafeInput = {
      intent: "verification",
      routePreview: {
        routeId: "route-secret",
        status: "preview"
      },
      runDraftSummary: `Inspect rawDom and rawCsv with ${secret}`,
      rawArguments: "never keep this",
      createdAt
    } as CapabilityPlanPreviewInput & Record<string, unknown>;

    const validation = validateCapabilityPlanPreviewInput(unsafeInput);
    const preview = buildCapabilityPlanPreview(unsafeInput);
    const serialized = JSON.stringify(preview);

    expect(validation.ok).toBe(false);
    expect(validation.warningCodes).toEqual(
      expect.arrayContaining([
        "FORBIDDEN_RAW_FIELD",
        "API_KEY_MARKER",
        "RAW_DOM_MARKER",
        "RAW_CSV_MARKER"
      ])
    );
    expect(preview.status).toBe("blocked");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("rawDom");
    expect(serialized).not.toContain("rawCsv");
    expect(serialized).not.toContain("never keep this");
  });

  it("produces deterministic plan ids and summary hashes with injected inputs", () => {
    const first = buildCapabilityPlanPreview({
      intent: "documentation",
      routePreview: { routeId: "route-docs", status: "preview" },
      runDraftSummary: "summary for docs",
      workspaceIndexRef: { refId: "workspace-index-1", count: 2 },
      createdAt,
      idGenerator: () => "plan-fixed"
    });
    const second = buildCapabilityPlanPreview({
      intent: "documentation",
      routePreview: { routeId: "route-docs", status: "preview" },
      runDraftSummary: "summary for docs",
      workspaceIndexRef: { refId: "workspace-index-1", count: 2 },
      createdAt,
      idGenerator: () => "plan-fixed"
    });

    expect(first.planId).toBe("plan-fixed");
    expect(first).toEqual(second);
    expect(summarizeCapabilityPlanPreview(first)).toEqual(
      summarizeCapabilityPlanPreview(second)
    );
  });
});
