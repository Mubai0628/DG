import { describe, expect, it } from "vitest";

import {
  InMemoryEventStore,
  createCapabilityRegistry,
  createDossierHash,
  createNativeFsWriteDraftDescriptor,
  createStaticAgentRouter,
  summarizeAgentRoutingPlan,
  validateAgentDossier,
  type AgentDossier,
  type AgentRequiredOutput
} from "../src/index.js";

const now = "2026-01-01T00:00:00.000Z";

const requiredOutputs: AgentRequiredOutput[] = [
  {
    id: "safe-output",
    title: "Safe output",
    format: "summary"
  }
];

function createEventStore(): InMemoryEventStore {
  let id = 0;
  return new InMemoryEventStore({
    clock: () => new Date(now),
    idFactory: () => {
      id += 1;
      return `event-${id}`;
    }
  });
}

function createRegistry() {
  const registry = createCapabilityRegistry();
  registry.register(createNativeFsWriteDraftDescriptor());
  return registry;
}

function baseDossier(overrides: Partial<AgentDossier> = {}): AgentDossier {
  const withoutHash: Omit<AgentDossier, "hash"> = {
    agentId: "task-1:coder",
    role: "coder",
    taskId: "task-1",
    objective: "Implement a safe static route summary",
    acceptedFacts: ["The current task is proposal-only"],
    activeConstraints: ["No shell execution"],
    allowedCapabilities: ["native.fs.write_draft"],
    requiredOutputs,
    forbiddenSideEffects: [
      "desktop_action",
      "shell_execution",
      "mcp_execution",
      "plugin_execution",
      "skill_execution",
      "memory_write",
      "patch_apply",
      "native_bridge_transport",
      "auto_convert",
      "file_write_from_bridge",
      "real_deepseek_api"
    ],
    evidenceRefs: [
      {
        id: "evidence-1",
        kind: "test_result",
        untrusted: false,
        summary: "A safe test result summary"
      }
    ],
    contextRefs: [
      { id: "context.taskContractHash", kind: "hash", hash: "abc" }
    ],
    memoryRefs: [{ id: "memory.ref.1", kind: "memory_ref" }],
    capabilityLeaseRefs: ["lease-1"],
    modelProfileId: "deepseek-v4-pro",
    createdAt: now,
    sensitivity: "internal",
    provenance: { routeId: "route-1", order: 2, intent: "code_change" },
    ...overrides
  };

  return {
    ...withoutHash,
    hash: createDossierHash(withoutHash)
  };
}

describe("AgentDossier validation", () => {
  it("creates valid orchestrator, coder, reviewer, and verifier dossiers", () => {
    const router = createStaticAgentRouter({
      clock: () => new Date(now),
      routeIdFactory: () => "route-1"
    });
    const plan = router.routeAgentTask({
      taskId: "task-1",
      intent: "code_change",
      objective: "Implement a narrow docs-safe static router",
      requiredCapabilities: ["native.fs.write_draft"],
      capabilityRegistry: createRegistry(),
      requiredOutputs,
      acceptanceCriteria: ["Router returns summaries only"],
      createdAt: now
    });

    expect(plan.status).toBe("planned");
    expect(plan.roles).toEqual([
      "orchestrator",
      "coder",
      "reviewer",
      "verifier"
    ]);
    expect(plan.steps.map((step) => step.dossier.role)).toEqual(plan.roles);
    expect(
      plan.steps.every(
        (step) =>
          validateAgentDossier(step.dossier, {
            capabilityRegistry: createRegistry()
          }).ok
      )
    ).toBe(true);
  });

  it("rejects unknown roles and unknown model profile ids", () => {
    const unknownRole = validateAgentDossier(
      baseDossier({ role: "planner" as AgentDossier["role"] })
    );
    const unknownModel = validateAgentDossier(
      baseDossier({ modelProfileId: "deepseek-chat" })
    );

    expect(
      unknownRole.ok ? [] : unknownRole.errors.map((error) => error.code)
    ).toContain("unknown_role");
    expect(
      unknownModel.ok ? [] : unknownModel.errors.map((error) => error.code)
    ).toContain("unknown_model_profile");
  });

  it("rejects raw prompt, raw DOM, raw CSV, API key, and direct command fields", () => {
    const raw = {
      ...baseDossier(),
      rawPrompt: "do private work",
      evidenceRefs: [
        {
          id: "evidence-1",
          kind: "browser_payload",
          untrusted: true,
          summary: "raw DOM and raw CSV marker"
        }
      ],
      provenance: {
        command: "pnpm test",
        apiKey: "sk-test1234567890abcdef"
      }
    } as unknown as AgentDossier;

    const result = validateAgentDossier(raw);

    expect(result.ok).toBe(false);
    expect(
      result.ok ? [] : result.isolationViolations.map((item) => item.code)
    ).toEqual(
      expect.arrayContaining(["forbidden_raw_field", "forbidden_raw_marker"])
    );
  });

  it("requires coder dossiers to carry forbidden side effects and required outputs", () => {
    const result = validateAgentDossier(
      baseDossier({
        forbiddenSideEffects: [],
        requiredOutputs: []
      })
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "coder_requires_forbidden_side_effects",
        "required_outputs_missing"
      ])
    );
  });

  it("keeps verifier dossiers to evidence and artifact references without raw reasoning", () => {
    const router = createStaticAgentRouter({
      clock: () => new Date(now),
      routeIdFactory: () => "route-1"
    });
    const plan = router.routeAgentTask({
      taskId: "task-1",
      intent: "verification",
      objective: "Verify artifacts using summary evidence",
      evidenceRefs: [
        {
          id: "artifact-1",
          kind: "artifact",
          untrusted: false,
          summary: "Draft CSV path and hash summary"
        }
      ],
      requiredOutputs,
      createdAt: now
    });
    const verifier = plan.steps.find((step) => step.role === "verifier");

    expect(plan.status).toBe("planned");
    expect(verifier?.dossier.evidenceRefs).toEqual([
      {
        id: "artifact-1",
        kind: "artifact",
        untrusted: false,
        summary: "Draft CSV path and hash summary"
      }
    ]);
    expect(JSON.stringify(verifier?.dossier)).not.toContain(
      "raw_model_reasoning"
    );
    expect(JSON.stringify(verifier?.dossier)).not.toContain("chainOfThought");
  });
});

describe("StaticAgentRouter", () => {
  it("routes web data extraction without an unnecessary coder", () => {
    const router = createStaticAgentRouter({
      clock: () => new Date(now),
      routeIdFactory: () => "route-web"
    });

    const plan = router.routeAgentTask({
      taskId: "task-web",
      intent: "web_data_extraction",
      objective: "Run deterministic web table extraction validation",
      createdAt: now
    });

    expect(plan.status).toBe("planned");
    expect(plan.roles).toEqual(["orchestrator", "verifier"]);
    expect(plan.steps.map((step) => step.role)).toEqual([
      "orchestrator",
      "verifier"
    ]);
  });

  it("routes code changes through coder, reviewer, and verifier", () => {
    const router = createStaticAgentRouter({
      clock: () => new Date(now),
      routeIdFactory: () => "route-code"
    });

    const plan = router.routeAgentTask({
      taskId: "task-code",
      intent: "code_change",
      objective: "Implement a proposal-only router and tests",
      requiredOutputs,
      acceptanceCriteria: ["No dynamic bidding"],
      createdAt: now
    });

    expect(plan.status).toBe("planned");
    expect(plan.roles).toEqual([
      "orchestrator",
      "coder",
      "reviewer",
      "verifier"
    ]);
    const serialized = JSON.stringify(plan);
    expect(serialized).not.toContain("bidScore");
    expect(serialized).not.toContain("agentBid");
    expect(serialized).not.toContain("bidder");
  });

  it("returns needs_clarification for unknown intent and unavailable capability", () => {
    const router = createStaticAgentRouter({
      clock: () => new Date(now),
      routeIdFactory: () => "route-unknown"
    });
    const unknownIntent = router.routeAgentTask({
      taskId: "task-unknown",
      intent: "unknown",
      objective: "unclear",
      createdAt: now
    });
    const missingCapability = router.routeAgentTask({
      taskId: "job-capability-missing",
      intent: "verification",
      objective: "Verify a capability-backed plan",
      requiredCapabilities: ["native.fs.missing"],
      capabilityRegistry: createRegistry(),
      createdAt: now
    });

    expect(unknownIntent.status).toBe("needs_clarification");
    expect(unknownIntent.warnings.map((warning) => warning.code)).toContain(
      "unknown_intent_needs_clarification"
    );
    expect(missingCapability.status).toBe("needs_clarification");
    expect(missingCapability.errors.map((error) => error.code)).toContain(
      "required_capability_unavailable"
    );
  });

  it("rejects forbidden desktop side effects and broker bypass requests", () => {
    const router = createStaticAgentRouter({
      clock: () => new Date(now),
      routeIdFactory: () => "route-forbidden"
    });

    const plan = router.routeAgentTask({
      taskId: "task-forbidden",
      intent: "verification",
      objective: "Verify without side effects",
      requestedSideEffects: ["desktop_action"],
      bypassCapabilityBroker: true,
      createdAt: now
    });

    expect(plan.status).toBe("rejected");
    expect(plan.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "forbidden_side_effect_requested",
        "capability_broker_bypass_rejected"
      ])
    );
  });

  it("validates required capability ids against CapabilityRegistry", () => {
    const router = createStaticAgentRouter({
      clock: () => new Date(now),
      routeIdFactory: () => "route-capability"
    });

    const plan = router.routeAgentTask({
      taskId: "task-capability",
      intent: "verification",
      objective: "Verify native write draft descriptor wiring",
      requiredCapabilities: ["native.fs.write_draft"],
      capabilityRegistry: createRegistry(),
      createdAt: now
    });

    expect(plan.status).toBe("planned");
    expect(plan.dossierSummaries[0]?.allowedCapabilities).toEqual([
      "native.fs.write_draft"
    ]);
  });

  it("rejects unknown model profiles and legacy aliases for new dossiers", () => {
    const router = createStaticAgentRouter({
      clock: () => new Date(now),
      routeIdFactory: () => "route-model"
    });

    const plan = router.routeAgentTask({
      taskId: "task-model",
      intent: "verification",
      objective: "Verify model profile mapping",
      modelProfileIds: ["deepseek-chat"],
      createdAt: now
    });

    expect(plan.status).toBe("rejected");
    expect(plan.errors.map((error) => error.code)).toContain(
      "unknown_model_profile"
    );
  });

  it("keeps routing reports and events summary-only", () => {
    const eventStore = createEventStore();
    const router = createStaticAgentRouter({
      eventStore,
      clock: () => new Date(now),
      routeIdFactory: () => "route-events"
    });
    const secret = "sk-test1234567890abcdef";

    const plan = router.routeAgentTask({
      taskId: "task-events",
      intent: "verification",
      objective: `raw prompt with raw code and ${secret}`,
      acceptedFacts: ["raw code should not be logged"],
      createdAt: now
    });
    const report = summarizeAgentRoutingPlan(plan);
    const serializedReport = JSON.stringify(report);
    const serializedEvents = JSON.stringify(eventStore.listEvents());

    expect(plan.status).toBe("rejected");
    expect(serializedReport).not.toContain(secret);
    expect(serializedReport).not.toContain("raw prompt");
    expect(serializedReport).not.toContain("raw code");
    expect(serializedEvents).not.toContain(secret);
    expect(serializedEvents).not.toContain("raw prompt");
    expect(serializedEvents).not.toContain("raw code");
    expect(eventStore.listEvents().map((event) => event.type)).toEqual([
      "agent.route.rejected"
    ]);
  });
});
