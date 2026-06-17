import {
  cloneCapabilityDescriptor,
  validateCapabilityDescriptor
} from "./descriptor.js";
import { CapabilityBrokerException } from "./errors.js";
import {
  type CapabilityCategory,
  type CapabilityDescriptor,
  type CapabilityRegistry,
  type CapabilitySourceType
} from "./types.js";

export class InMemoryCapabilityRegistry implements CapabilityRegistry {
  private readonly descriptors = new Map<string, CapabilityDescriptor>();

  register(descriptor: CapabilityDescriptor): void {
    if (this.descriptors.has(descriptor.id)) {
      throw new CapabilityBrokerException({
        kind: "duplicate_descriptor",
        code: "duplicate_descriptor_id",
        safeMessage: "Capability descriptor id is already registered",
        capabilityId: descriptor.id
      });
    }

    const validation = validateCapabilityDescriptor(descriptor);
    if (!validation.ok) {
      throw new CapabilityBrokerException(validation.errors[0]!);
    }

    this.descriptors.set(
      descriptor.id,
      cloneCapabilityDescriptor(validation.descriptor)
    );
  }

  list(): CapabilityDescriptor[] {
    return [...this.descriptors.values()]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((descriptor) => cloneCapabilityDescriptor(descriptor));
  }

  get(id: string): CapabilityDescriptor | undefined {
    const descriptor = this.descriptors.get(id);
    return descriptor === undefined
      ? undefined
      : cloneCapabilityDescriptor(descriptor);
  }

  findByCategory(category: CapabilityCategory): CapabilityDescriptor[] {
    return this.list().filter((descriptor) => descriptor.category === category);
  }

  findBySourceType(sourceType: CapabilitySourceType): CapabilityDescriptor[] {
    return this.list().filter(
      (descriptor) => descriptor.sourceType === sourceType
    );
  }
}

export function createCapabilityRegistry(): CapabilityRegistry {
  return new InMemoryCapabilityRegistry();
}

export function registerCapabilityDescriptor(
  registry: CapabilityRegistry,
  descriptor: CapabilityDescriptor
): void {
  registry.register(descriptor);
}

export function listCapabilityDescriptors(
  registry: CapabilityRegistry
): CapabilityDescriptor[] {
  return registry.list();
}

export function getCapabilityDescriptor(
  registry: CapabilityRegistry,
  id: string
): CapabilityDescriptor | undefined {
  return registry.get(id);
}

export function findCapabilitiesByCategory(
  registry: CapabilityRegistry,
  category: CapabilityCategory
): CapabilityDescriptor[] {
  return registry.findByCategory(category);
}

export function findCapabilitiesBySourceType(
  registry: CapabilityRegistry,
  sourceType: CapabilitySourceType
): CapabilityDescriptor[] {
  return registry.findBySourceType(sourceType);
}
