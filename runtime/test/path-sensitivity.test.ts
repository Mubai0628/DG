import { describe, expect, it } from "vitest";

import {
  gradePathSensitivity,
  isSensitivePath,
  pathReadGate,
  pathReadOperationClass,
  type PathSensitivityGrade
} from "../src/index.js";

const GRADE_CORPUS: Array<[string, PathSensitivityGrade]> = [
  // normal reads
  ["src/index.ts", "normal"],
  ["docs/readme.md", "normal"],
  ["scripts/format-all.sh", "normal"],
  ["folder/sub.folder/file.json", "normal"],
  // protected infrastructure
  [".git/config", "protected"],
  ["repo/.git/HEAD", "protected"],
  ["node_modules/react/index.js", "protected"],
  ["pkg/node_modules/lib/a.ts", "protected"],
  // env files
  [".env", "sensitive"],
  [".env.local", "sensitive"],
  ["config/.env.production", "sensitive"],
  // ssh and key material
  [".ssh/id_rsa", "sensitive"],
  ["home/user/.ssh/config", "sensitive"],
  ["keys/id_rsa", "sensitive"],
  ["keys/id_rsa.pub", "sensitive"],
  ["keys/id_ed25519", "sensitive"],
  ["certs/server.pem", "sensitive"],
  ["certs/server.key", "sensitive"],
  ["certs/bundle.p12", "sensitive"],
  ["certs/bundle.pfx", "sensitive"],
  ["keys/private-key.pem", "sensitive"],
  ["keys/private_key", "sensitive"],
  // secret-like names
  ["secrets/app.txt", "sensitive"],
  ["config/my-secrets.json", "sensitive"],
  ["app/credentials.json", "sensitive"],
  ["db/passwords.txt", "sensitive"],
  ["ci/api_key.txt", "sensitive"],
  ["ci/apikey.yaml", "sensitive"],
  ["ci/api-key.yaml", "sensitive"],
  ["tokens/refresh.txt", "sensitive"],
  // separator and case handling
  ["config\\.env", "sensitive"],
  ["Certs\\SERVER.PEM", "sensitive"],
  ["REPO\\.GIT\\config", "protected"]
];

describe("path sensitivity grading", () => {
  it.each(GRADE_CORPUS)("grades %s as %s", (pathText, expected) => {
    expect(gradePathSensitivity(pathText)).toBe(expected);
  });

  it("exposes the sensitive-path convenience check", () => {
    expect(isSensitivePath(".env")).toBe(true);
    expect(isSensitivePath("src/index.ts")).toBe(false);
    expect(isSensitivePath(".git/config")).toBe(false);
  });

  it("maps grades to operation classes", () => {
    expect(pathReadOperationClass("src/index.ts")).toBe("file_read");
    expect(pathReadOperationClass(".ssh/id_rsa")).toBe("sensitive_file_read");
    expect(pathReadOperationClass(".git/config")).toBeUndefined();
  });

  it("gates reads per tier", () => {
    // approval_required: everything requires approval
    expect(pathReadGate("approval_required", "src/a.ts")).toBe(
      "requires_approval"
    );
    // read_auto_approved: plain reads auto, sensitive reads need approval
    expect(pathReadGate("read_auto_approved", "src/a.ts")).toBe("auto");
    expect(pathReadGate("read_auto_approved", ".env")).toBe(
      "requires_approval"
    );
    // guarded_open: plain reads auto, sensitive reads still need approval
    expect(pathReadGate("guarded_open", "src/a.ts")).toBe("auto");
    expect(pathReadGate("guarded_open", ".ssh/id_rsa")).toBe(
      "requires_approval"
    );
    // unrestricted: all auto
    expect(pathReadGate("unrestricted", ".env")).toBe("auto");
    // protected paths are blocked in every tier, including unrestricted
    expect(pathReadGate("unrestricted", ".git/config")).toBe("blocked");
    expect(pathReadGate("approval_required", "node_modules/x/index.js")).toBe(
      "blocked"
    );
  });
});
