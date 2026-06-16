import { createHash, randomUUID } from "node:crypto";

export function createPairingToken(): string {
  return randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
}

export function hashPairingToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function fingerprintToken(token: string): string {
  return hashPairingToken(token).slice(0, 12);
}

export function tokensMatch(candidate: string, expectedHash: string): boolean {
  return hashPairingToken(candidate) === expectedHash;
}
