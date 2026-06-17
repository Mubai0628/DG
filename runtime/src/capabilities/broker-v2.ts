import { type EventStore } from "../events/index.js";

import { decideCapabilityInvocation } from "./invocation-policy.js";
import { createCapabilityRegistry } from "./registry.js";
import {
  type CapabilityArgumentSummary,
  type CapabilityBrokerV2Options,
  type CapabilityDescriptor,
  type CapabilityDryRunResult,
  type CapabilityInvocationPlan,
  type CapabilityInvocationRequest,
  type CapabilityRegistry
} from "./types.js";

export class CapabilityBrokerV2 {
  private readonly registry: CapabilityRegistry;
  private readonly eventStore: EventStore | undefined;
  private readonly clock: () => Date;

  constructor(options: CapabilityBrokerV2Options = {}) {
    this.registry = options.registry ?? createCapabilityRegistry();
    this.eventStore = options.eventStore;
    this.clock = options.clock ?? (() => new Date());
  }

  planCapabilityInvocation(
    request: CapabilityInvocationRequest
  ): CapabilityInvocationPlan {
    const eventIds: string[] = [];
    const descriptor = this.registry.get(request.capabilityId);

    eventIds.push(
      ...this.appendCapabilityEvent("capability.invocation.proposed", request, {
        decision: "proposed"
      })
    );

    if (descriptor === undefined) {
      const plan = withEvents(
        {
          requestId: request.id,
          capabilityId: request.capabilityId,
          status: "unknown_capability",
          decision: "unknown_capability",
          dryRunAvailable: false,
          reasons: ["unknown_capability"]
        },
        eventIds
      );
      eventIds.push(...this.logRejected(request, plan));
      return withEvents(plan, eventIds);
    }

    const argumentSummary = summarizeCapabilityInput(request.input);
    const base = descriptorPlanFields(descriptor);
    const inputValid = isPlainObject(request.input);
    if (!inputValid) {
      const plan = withEvents(
        {
          requestId: request.id,
          capabilityId: request.capabilityId,
          ...base,
          status: "denied",
          decision: "invalid_input",
          dryRunAvailable: descriptor.supportsDryRun,
          reasons: ["input_must_be_object"]
        },
        eventIds
      );
      eventIds.push(
        ...this.logRejected(request, plan, descriptor, argumentSummary)
      );
      return withEvents(plan, eventIds);
    }

    const policy = decideCapabilityInvocation({
      request,
      descriptor,
      now: this.clock()
    });
    const dryRunResult = descriptor.supportsDryRun
      ? buildDryRunResult(descriptor, argumentSummary)
      : undefined;

    const plan = withEvents(
      {
        requestId: request.id,
        capabilityId: request.capabilityId,
        ...base,
        status: policy.status,
        decision: policy.decision,
        dryRunAvailable: descriptor.supportsDryRun,
        ...(dryRunResult !== undefined ? { dryRunResult } : {}),
        ...(policy.leaseId !== undefined ? { leaseId: policy.leaseId } : {}),
        reasons: policy.reasons
      },
      eventIds
    );

    eventIds.push(
      ...this.appendCapabilityEvent("capability.invocation.planned", request, {
        descriptor,
        decision: plan.decision,
        argumentSummary,
        reasons: plan.reasons,
        ...(plan.leaseId !== undefined ? { leaseId: plan.leaseId } : {})
      })
    );

    return withEvents(plan, eventIds);
  }

  private logRejected(
    request: CapabilityInvocationRequest,
    plan: CapabilityInvocationPlan,
    descriptor?: CapabilityDescriptor,
    argumentSummary?: CapabilityArgumentSummary
  ): string[] {
    const eventInput: Parameters<
      CapabilityBrokerV2["appendCapabilityEvent"]
    >[2] = {
      decision: plan.decision,
      reasons: plan.reasons
    };
    if (descriptor !== undefined) {
      eventInput.descriptor = descriptor;
    }
    if (argumentSummary !== undefined) {
      eventInput.argumentSummary = argumentSummary;
    }
    return this.appendCapabilityEvent(
      "capability.invocation.rejected",
      request,
      eventInput
    );
  }

  private appendCapabilityEvent(
    type:
      | "capability.invocation.proposed"
      | "capability.invocation.planned"
      | "capability.invocation.rejected",
    request: CapabilityInvocationRequest,
    input: {
      descriptor?: CapabilityDescriptor;
      decision: string;
      argumentSummary?: CapabilityArgumentSummary;
      reasons?: string[];
      leaseId?: string;
    }
  ): string[] {
    if (this.eventStore === undefined) {
      return [];
    }

    const payload: Record<string, unknown> = {
      capabilityId: request.capabilityId,
      decision: input.decision
    };
    if (input.descriptor !== undefined) {
      payload.sourceType = input.descriptor.sourceType;
      payload.category = input.descriptor.category;
      payload.riskLevel = input.descriptor.riskLevel;
      payload.invokePolicy = input.descriptor.invokePolicy;
      payload.executionMode = input.descriptor.executionMode;
    }
    if (input.argumentSummary !== undefined) {
      payload.argumentSummary = input.argumentSummary;
    }
    if (input.reasons !== undefined) {
      payload.reasons = input.reasons;
    }
    if (input.leaseId !== undefined) {
      payload.leaseId = input.leaseId;
    }

    const record = this.eventStore.appendEvent({
      type,
      ...(request.taskId !== undefined ? { taskId: request.taskId } : {}),
      ...(request.agentId !== undefined ? { agentId: request.agentId } : {}),
      payload
    });

    return [record.id];
  }
}

export function planCapabilityInvocation(
  broker: CapabilityBrokerV2,
  request: CapabilityInvocationRequest
): CapabilityInvocationPlan {
  return broker.planCapabilityInvocation(request);
}

export function summarizeCapabilityInput(
  input: unknown
): CapabilityArgumentSummary {
  if (!isPlainObject(input)) {
    return { keyCount: 0, keys: [] };
  }

  const keys = Object.keys(input)
    .filter((key) => isSafeSummaryKey(key))
    .sort();
  const summary: CapabilityArgumentSummary = {
    keyCount: keys.length,
    keys
  };
  if (typeof input.filename === "string") {
    summary.filename = input.filename;
  }
  if (typeof input.contentType === "string") {
    summary.contentType = input.contentType;
  }
  if (typeof input.content === "string") {
    summary.contentBytes = Buffer.byteLength(input.content, "utf8");
  }
  return summary;
}

function buildDryRunResult(
  descriptor: CapabilityDescriptor,
  argumentSummary: CapabilityArgumentSummary
): CapabilityDryRunResult {
  return {
    ok: true,
    capabilityId: descriptor.id,
    argumentSummary,
    wouldExecute: false,
    warnings:
      descriptor.executionMode === "MUTATING"
        ? ["dry_run_only_no_side_effect"]
        : []
  };
}

function descriptorPlanFields(descriptor: CapabilityDescriptor): {
  riskLevel: CapabilityDescriptor["riskLevel"];
  sourceType: CapabilityDescriptor["sourceType"];
  category: CapabilityDescriptor["category"];
  invokePolicy: CapabilityDescriptor["invokePolicy"];
  executionMode: CapabilityDescriptor["executionMode"];
} {
  return {
    riskLevel: descriptor.riskLevel,
    sourceType: descriptor.sourceType,
    category: descriptor.category,
    invokePolicy: descriptor.invokePolicy,
    executionMode: descriptor.executionMode
  };
}

function withEvents<T extends CapabilityInvocationPlan>(
  plan: T,
  eventIds: string[]
): T {
  if (eventIds.length === 0) {
    return plan;
  }
  return { ...plan, eventIds };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeSummaryKey(key: string): boolean {
  return !/(content|payload|raw|api|authorization|token|secret|key)/i.test(key);
}
