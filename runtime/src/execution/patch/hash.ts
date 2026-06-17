import { createHash } from "node:crypto";

export function patchSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashPatchObject(value: unknown): string {
  return patchSha256(stableStringify(value));
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableStringify(entryValue)}`
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function byteLengthUtf8(value: string): number {
  return Buffer.byteLength(value, "utf8");
}
