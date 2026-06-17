import { describe, expect, it } from "vitest";

import {
  CapabilityBrokerException,
  CapabilityBrokerV2,
  InMemoryEventStore,
  createCapabilityRegistry,
  createNativeFsWriteDraftDescriptor,
  expirePermissionLease,
  findCapabilitiesByCategory,
  findCapabilitiesBySourceType,
  issuePermissionLease,
  registerCapabilityDescriptor,
  revokePermissionLease,
  summarizePermissionLease,
  validateCapabilityDescriptor,
  validatePermissionLease,
  type CapabilityDescriptor
} from "../src/index.js";

function validDescriptor(
  overrides: Partial<CapabilityDescriptor> = {}
): CapabilityDescriptor {
  return {
    id: "native.knowledge.read",
    title: "Read local knowledge summary",
    sourceType: "native",
    category: "knowledge",
    riskLevel: "A1_read",
    invokePolicy: "AUTO",
    executionMode: "READ_ONLY",
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    supportsDryRun: true,
    requiresElicitation: false,
    canWriteMemory: false,
    trustTier: "core",
    version: "0.2.0",
    owner: "runtime",
    description: "Test descriptor",
    eventTypes: ["capability.invocation.planned"],
    ...overrides
  };
}

function createEventStore(): InMemoryEventStore {
  let id = 0;
  return new InMemoryEventStore({
    clock: () => new Date("2026-01-01T00:00:00.000Z"),
    idFactory: () => {
      id += 1;
      return `event-${id}`;
    }
  });
}

describe("CapabilityDescriptor validation and registry", () => {
  it("registers valid native fs.write_draft descriptor", () => {
    const registry = createCapabilityRegistry();
    registry.register(createNativeFsWriteDraftDescriptor());

    expect(registry.get("native.fs.write_draft")).toMatchObject({
      id: "native.fs.write_draft",
      sourceType: "native",
      category: "fs",
      riskLevel: "A2_draft_write",
      invokePolicy: "ASK_FIRST",
      executionMode: "MUTATING"
    });
  });

  it("rejects duplicate descriptor ids", () => {
    const registry = createCapabilityRegistry();
    registry.register(validDescriptor());

    expect(() => registry.register(validDescriptor())).toThrow(
      CapabilityBrokerException
    );
  });

  it("rejects unknown source type and unsafe ids", () => {
    const descriptor = validDescriptor({
      id: "../bad;id",
      sourceType: "unknown" as CapabilityDescriptor["sourceType"]
    });

    const result = validateCapabilityDescriptor(descriptor);

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors.map((error) => error.code)).toContain(
      "unknown_source_type"
    );
    expect(result.ok ? [] : result.errors.map((error) => error.code)).toContain(
      "invalid_id"
    );
  });

  it("rejects mutating AUTO and high-risk AUTO descriptors", () => {
    const mutating = validateCapabilityDescriptor(
      validDescriptor({
        id: "native.fs.bad",
        category: "fs",
        riskLevel: "A2_draft_write",
        invokePolicy: "AUTO",
        executionMode: "MUTATING"
      })
    );
    const highRisk = validateCapabilityDescriptor(
      validDescriptor({
        id: "native.git.push",
        category: "git",
        riskLevel: "A4_external_effect",
        invokePolicy: "AUTO"
      })
    );

    expect(
      mutating.ok ? [] : mutating.errors.map((error) => error.code)
    ).toContain("mutating_auto_rejected");
    expect(
      highRisk.ok ? [] : highRisk.errors.map((error) => error.code)
    ).toContain("high_risk_auto_rejected");
  });

  it("rejects mcp/plugin/skill mutating descriptors and memory writers", () => {
    for (const sourceType of ["mcp", "plugin", "skill"] as const) {
      const result = validateCapabilityDescriptor(
        validDescriptor({
          id: `${sourceType}.fs.write`,
          sourceType,
          invokePolicy: "MANUAL_ONLY",
          executionMode: "MUTATING",
          canWriteMemory: true
        })
      );

      expect(result.ok).toBe(false);
      expect(
        result.ok ? [] : result.errors.map((error) => error.code)
      ).toContain("external_mutating_rejected");
      expect(
        result.ok ? [] : result.errors.map((error) => error.code)
      ).toContain("memory_write_rejected");
    }
  });

  it("requires mcp/plugin/skill descriptors to be disabled or simulate-only dry-run descriptors", () => {
    const invalid = validateCapabilityDescriptor(
      validDescriptor({
        id: "mcp.knowledge.read",
        sourceType: "mcp",
        invokePolicy: "AUTO",
        executionMode: "READ_ONLY",
        supportsDryRun: false
      })
    );
    const valid = validateCapabilityDescriptor(
      validDescriptor({
        id: "mcp.knowledge.preview",
        sourceType: "mcp",
        invokePolicy: "MANUAL_ONLY",
        executionMode: "SIMULATE",
        trustTier: "restricted"
      })
    );

    expect(invalid.ok ? [] : invalid.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "external_descriptor_must_simulate",
        "external_dry_run_required"
      ])
    );
    expect(valid.ok).toBe(true);
  });

  it("allows shell and desktop descriptors only when disabled", () => {
    const liveShell = validateCapabilityDescriptor(
      validDescriptor({
        id: "native.shell.run",
        category: "shell",
        invokePolicy: "ASK_FIRST",
        executionMode: "SIMULATE"
      })
    );
    const disabledDesktop = validateCapabilityDescriptor(
      validDescriptor({
        id: "native.desktop.click",
        category: "desktop",
        invokePolicy: "DISABLED",
        executionMode: "SIMULATE",
        disabledReason: "desktop action is out of scope"
      })
    );

    expect(
      liveShell.ok ? [] : liveShell.errors.map((error) => error.code)
    ).toContain("shell_capability_disabled_only");
    expect(disabledDesktop.ok).toBe(true);
  });

  it("supports registry list and find helpers", () => {
    const registry = createCapabilityRegistry();
    registerCapabilityDescriptor(
      registry,
      createNativeFsWriteDraftDescriptor()
    );
    registerCapabilityDescriptor(
      registry,
      validDescriptor({ id: "native.knowledge.read" })
    );

    expect(registry.list().map((descriptor) => descriptor.id)).toEqual([
      "native.fs.write_draft",
      "native.knowledge.read"
    ]);
    expect(findCapabilitiesByCategory(registry, "fs")).toHaveLength(1);
    expect(findCapabilitiesBySourceType(registry, "native")).toHaveLength(2);
  });
});

describe("PermissionLease", () => {
  it("issues, validates, revokes, and expires leases", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const lease = issuePermissionLease(
      {
        taskId: "task-1",
        agentId: "agent-1",
        capabilityId: "native.fs.write_draft",
        target: "workspace/drafts",
        scope: "drafts/*.csv",
        riskLevel: "A2_draft_write",
        grantedBy: "user",
        ttlMs: 60_000
      },
      {
        clock: () => now,
        idFactory: () => "lease-1"
      }
    );
    const descriptor = createNativeFsWriteDraftDescriptor();

    expect(
      validatePermissionLease(lease, {
        request: {
          id: "request-1",
          capabilityId: "native.fs.write_draft",
          taskId: "task-1",
          agentId: "agent-1",
          input: {}
        },
        descriptor,
        now
      }).ok
    ).toBe(true);
    expect(summarizePermissionLease(lease)).toMatchObject({
      leaseId: "lease-1",
      capabilityId: "native.fs.write_draft",
      status: "active"
    });
    expect(
      validatePermissionLease(revokePermissionLease(lease), {
        request: {
          id: "request-1",
          capabilityId: "native.fs.write_draft",
          input: {}
        },
        descriptor,
        now
      })
    ).toMatchObject({ ok: false, reason: "revoked" });
    expect(
      validatePermissionLease(expirePermissionLease(lease), {
        request: {
          id: "request-1",
          capabilityId: "native.fs.write_draft",
          input: {}
        },
        descriptor,
        now
      })
    ).toMatchObject({ ok: false, reason: "expired" });
  });

  it("rejects wrong task, agent, capability, and risk escalation", () => {
    const lease = issuePermissionLease({
      taskId: "task-1",
      agentId: "agent-1",
      capabilityId: "native.fs.write_draft",
      target: "workspace/drafts",
      scope: "drafts/*.csv",
      riskLevel: "A1_read",
      grantedBy: "user"
    });
    const descriptor = createNativeFsWriteDraftDescriptor();

    expect(
      validatePermissionLease(lease, {
        request: {
          id: "wrong-task",
          capabilityId: "native.fs.write_draft",
          taskId: "task-2",
          agentId: "agent-1",
          input: {}
        },
        descriptor
      })
    ).toMatchObject({ ok: false, reason: "wrong_task" });
    expect(
      validatePermissionLease(lease, {
        request: {
          id: "wrong-agent",
          capabilityId: "native.fs.write_draft",
          taskId: "task-1",
          agentId: "agent-2",
          input: {}
        },
        descriptor
      })
    ).toMatchObject({ ok: false, reason: "wrong_agent" });
    expect(
      validatePermissionLease(lease, {
        request: {
          id: "wrong-capability",
          capabilityId: "native.git.write",
          taskId: "task-1",
          agentId: "agent-1",
          input: {}
        },
        descriptor
      })
    ).toMatchObject({ ok: false, reason: "wrong_capability" });
    expect(
      validatePermissionLease(lease, {
        request: {
          id: "risk",
          capabilityId: "native.fs.write_draft",
          taskId: "task-1",
          agentId: "agent-1",
          input: {}
        },
        descriptor
      })
    ).toMatchObject({ ok: false, reason: "risk_escalation" });
  });
});

describe("CapabilityBrokerV2 planning", () => {
  it("returns unknown_capability without executing anything", () => {
    const broker = new CapabilityBrokerV2();

    const plan = broker.planCapabilityInvocation({
      id: "request-1",
      capabilityId: "missing.capability",
      input: {}
    });

    expect(plan.status).toBe("unknown_capability");
    expect(plan.dryRunAvailable).toBe(false);
  });

  it("returns disabled for disabled capabilities", () => {
    const registry = createCapabilityRegistry();
    registry.register(
      validDescriptor({
        id: "native.desktop.click",
        category: "desktop",
        invokePolicy: "DISABLED",
        executionMode: "SIMULATE",
        disabledReason: "desktop action disabled"
      })
    );
    const broker = new CapabilityBrokerV2({ registry });

    const plan = broker.planCapabilityInvocation({
      id: "request-1",
      capabilityId: "native.desktop.click",
      input: {}
    });

    expect(plan).toMatchObject({
      status: "disabled",
      decision: "disabled",
      reasons: ["desktop action disabled"]
    });
  });

  it("plans A2 draft writes without calling ToolBroker or writing files", () => {
    const registry = createCapabilityRegistry();
    registry.register(createNativeFsWriteDraftDescriptor());
    const broker = new CapabilityBrokerV2({ registry });

    const plan = broker.planCapabilityInvocation({
      id: "request-1",
      capabilityId: "native.fs.write_draft",
      taskId: "task-1",
      agentId: "agent-1",
      input: {
        filename: "table.csv",
        content: "name,value\nalpha,1\n",
        contentType: "text/csv"
      }
    });

    expect(plan.status).toBe("approval_required");
    expect(plan.dryRunResult).toMatchObject({
      wouldExecute: false,
      argumentSummary: {
        filename: "table.csv",
        contentType: "text/csv",
        contentBytes: 19
      }
    });
  });

  it("uses a valid lease to allow a planned capability without executing it", () => {
    const registry = createCapabilityRegistry();
    registry.register(createNativeFsWriteDraftDescriptor());
    const lease = issuePermissionLease({
      taskId: "task-1",
      agentId: "agent-1",
      capabilityId: "native.fs.write_draft",
      target: "workspace/drafts",
      scope: "drafts/*.csv",
      riskLevel: "A2_draft_write",
      grantedBy: "user"
    });
    const broker = new CapabilityBrokerV2({ registry });

    const plan = broker.planCapabilityInvocation({
      id: "request-1",
      capabilityId: "native.fs.write_draft",
      taskId: "task-1",
      agentId: "agent-1",
      lease,
      input: {
        filename: "table.csv",
        content: "name,value\nalpha,1\n",
        contentType: "text/csv"
      }
    });

    expect(plan.status).toBe("allowed");
    expect(plan.decision).toBe("allowed_by_policy");
    expect(plan.leaseId).toBe(lease.leaseId);
    expect(plan.dryRunResult?.wouldExecute).toBe(false);
  });

  it("keeps mcp/plugin/skill invocation proposal-only", () => {
    const registry = createCapabilityRegistry();
    for (const sourceType of ["mcp", "plugin", "skill"] as const) {
      registry.register(
        validDescriptor({
          id: `${sourceType}.knowledge.preview`,
          sourceType,
          invokePolicy: "MANUAL_ONLY",
          executionMode: "SIMULATE",
          trustTier: "restricted"
        })
      );
    }
    const broker = new CapabilityBrokerV2({ registry });

    for (const sourceType of ["mcp", "plugin", "skill"] as const) {
      const plan = broker.planCapabilityInvocation({
        id: `request-${sourceType}`,
        capabilityId: `${sourceType}.knowledge.preview`,
        input: { topic: "docs" }
      });

      expect(plan.status).toBe("approval_required");
      expect(plan.decision).toBe("manual_only");
      expect(plan.dryRunResult?.wouldExecute).toBe(false);
    }
  });

  it("logs summary-only proposal events without raw args or secrets", () => {
    const registry = createCapabilityRegistry();
    registry.register(createNativeFsWriteDraftDescriptor());
    const eventStore = createEventStore();
    const broker = new CapabilityBrokerV2({ registry, eventStore });
    const secret = "sk-test1234567890abcdef";

    broker.planCapabilityInvocation({
      id: "request-1",
      capabilityId: "native.fs.write_draft",
      taskId: "task-1",
      agentId: "agent-1",
      input: {
        filename: "table.csv",
        content: `name,value\nsecret,${secret}\n`,
        contentType: "text/csv",
        apiKey: secret,
        rawPayload: "private"
      }
    });
    const serialized = JSON.stringify(eventStore.listEvents());

    expect(eventStore.listEvents().map((event) => event.type)).toEqual([
      "capability.invocation.proposed",
      "capability.invocation.planned"
    ]);
    expect(serialized).toContain("native.fs.write_draft");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("name,value");
    expect(serialized).not.toContain("rawPayload");
    expect(serialized).not.toContain("apiKey");
  });
});
