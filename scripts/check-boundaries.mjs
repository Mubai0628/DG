import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const execFileAsync = promisify(execFile);
const maxTextFileBytes = 1_000_000;

const ignoredDirectoryNames = new Set([
  ".git",
  ".tmp",
  "node_modules",
  "dist",
  "coverage",
  ".turbo",
  ".vite",
  "gen",
  "target",
  "deepseek_workbench_v0_2_1_codex_pack",
  "results",
  "reports"
]);

const ignoredRelativePathPrefixes = [
  ".tmp/",
  "app/dist/",
  "app/src-tauri/gen/",
  "app/src-tauri/target/",
  "browser-extension/dist/",
  "conformance/results/",
  "evals/reports/",
  "runtime/dist/",
  "deepseek_workbench_v0_2_1_codex_pack/"
];

const ignoredFiles = new Set(["pnpm-lock.yaml"]);

const textExtensions = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".rs",
  ".toml",
  ".yml",
  ".yaml",
  ".html",
  ".txt"
]);

const forbiddenDependencyNames = [
  "playwright",
  "puppeteer",
  "jsdom",
  "electron",
  "robotjs",
  "nut-js",
  "chrome-remote-interface",
  "@modelcontextprotocol"
];

const boundaryPatterns = [
  { id: "playwright_reference", pattern: /\bplaywright\b/i },
  { id: "puppeteer_reference", pattern: /\bpuppeteer\b/i },
  { id: "jsdom_reference", pattern: /\bjsdom\b/i },
  { id: "electron_reference", pattern: /\belectron\b/i },
  { id: "robotjs_reference", pattern: /\brobotjs\b/i },
  { id: "nut_js_reference", pattern: /\bnut-js\b/i },
  { id: "chrome_debugger_reference", pattern: /\bchrome\.debugger\b/ },
  { id: "native_messaging_reference", pattern: /\bnativeMessaging\b/ },
  { id: "global_shortcut_reference", pattern: /\bglobalShortcut\b/ },
  { id: "tauri_shell_plugin_reference", pattern: /@tauri-apps\/plugin-shell/ },
  { id: "tauri_shell_permission_reference", pattern: /\bshell:/ },
  {
    id: "tauri_arbitrary_command_reference",
    pattern: /Command::new\s*\(\s*command\b/
  },
  { id: "std_process_command_reference", pattern: /\bstd::process::Command\b/ },
  { id: "chrome_cookies_reference", pattern: /\bchrome\.cookies\b/ },
  { id: "chrome_storage_reference", pattern: /\bchrome\.storage\b/ },
  { id: "document_cookie_reference", pattern: /\bdocument\.cookie\b/ },
  { id: "local_storage_reference", pattern: /\blocalStorage\b/ },
  { id: "session_storage_reference", pattern: /\bsessionStorage\b/ },
  { id: "inner_html_reference", pattern: /\binnerHTML\b/ },
  { id: "outer_html_reference", pattern: /\bouterHTML\b/ },
  { id: "raw_prompt_reference", pattern: /\brawPrompt\b/ },
  { id: "raw_dom_reference", pattern: /\brawDom\b/ },
  { id: "raw_screenshot_reference", pattern: /\brawScreenshot\b/ },
  { id: "clipboard_reference", pattern: /\bclipboard\b/i },
  { id: "network_fetch_reference", pattern: /\bfetch\s*\(/ },
  { id: "xml_http_request_reference", pattern: /\bXMLHttpRequest\b/ },
  { id: "node_create_server_reference", pattern: /\bcreateServer\s*\(/ },
  { id: "network_listen_reference", pattern: /(?:\.|\b)listen\s*\(/ },
  {
    id: "native_message_send_reference",
    pattern: /\bchrome\.runtime\.sendNativeMessage\b|\bsendNativeMessage\s*\(/
  },
  {
    id: "native_connect_reference",
    pattern: /\bchrome\.runtime\.connectNative\b|\bconnectNative\s*\(/
  },
  {
    id: "query_selector_all_reference",
    pattern: /\bdocument\.querySelectorAll\b/
  },
  {
    id: "get_elements_by_tag_name_reference",
    pattern: /\bgetElementsByTagName\b/
  }
];

const secretPatterns = [
  { id: "sk_like_key", pattern: /\bsk-[A-Za-z0-9_-]{16,}\b/ },
  { id: "bearer_token", pattern: /\bBearer\s+[A-Za-z0-9._-]{16,}\b/ },
  { id: "api_key_console", pattern: /\bapiKey\b.*\bconsole\b/i },
  { id: "authorization_console", pattern: /\bAuthorization\b.*\bconsole\b/i },
  {
    id: "deepseek_env_reference",
    pattern: /\bprocess\.env\.DEEPSEEK_API_KEY\b|\bDEEPSEEK_API_KEY\b/
  },
  {
    id: "openai_env_reference",
    pattern: /\bprocess\.env\.OPENAI_API_KEY\b|\bOPENAI_API_KEY\b/
  }
];

export async function runBoundaryCheck(options = {}) {
  const root = path.resolve(options.root ?? repoRoot);
  const files = await listTextFiles(root);
  const findings = [];

  for (const packageFile of files.filter(
    (file) => path.basename(file) === "package.json"
  )) {
    findings.push(...(await checkPackageDependencies(root, packageFile)));
  }

  for (const file of files) {
    if (ignoredFiles.has(path.basename(file))) {
      continue;
    }
    const text = await readFile(file, "utf8");
    findings.push(
      ...checkTextPatterns(
        root,
        file,
        text,
        boundaryPatterns,
        isAllowedBoundaryHit
      ),
      ...checkMvpHardeningBoundaries(root, file, text)
    );
  }

  return finishCheck("Boundary check", findings, options);
}

export async function runSecretCheck(options = {}) {
  const root = path.resolve(options.root ?? repoRoot);
  const files = await listTextFiles(root);
  const findings = [];

  for (const file of files) {
    if (ignoredFiles.has(path.basename(file))) {
      continue;
    }
    const text = await readFile(file, "utf8");
    findings.push(
      ...checkTextPatterns(root, file, text, secretPatterns, isAllowedSecretHit)
    );
  }

  return finishCheck("Secret check", findings, options);
}

async function checkPackageDependencies(root, packageFile) {
  const rel = toPosix(path.relative(root, packageFile));
  const packageJson = JSON.parse(await readFile(packageFile, "utf8"));
  const dependencyGroups = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies"
  ];
  const findings = [];

  for (const group of dependencyGroups) {
    const dependencies = packageJson[group] ?? {};
    for (const name of Object.keys(dependencies)) {
      const normalized = name.toLowerCase();
      if (
        forbiddenDependencyNames.some(
          (forbidden) =>
            normalized === forbidden || normalized.includes(forbidden)
        )
      ) {
        findings.push({
          file: rel,
          line: 1,
          ruleId: "forbidden_dependency",
          detail: `${group}:${name}`
        });
      }
    }
  }

  return findings;
}

function checkTextPatterns(root, file, text, patterns, allowHit) {
  const rel = toPosix(path.relative(root, file));
  const findings = [];
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const rule of patterns) {
      if (rule.pattern.test(line) && !allowHit(rel, line, rule.id)) {
        findings.push({
          file: rel,
          line: index + 1,
          ruleId: rule.id
        });
      }
    }
  }

  return findings;
}

function isAllowedBoundaryHit(file, line, ruleId) {
  if (isBoundaryDoc(file)) {
    return true;
  }
  if (isTestFile(file)) {
    return true;
  }
  if (file.startsWith("evals/web-table-to-csv/cases/")) {
    return true;
  }
  if (file === "evals/web-table-to-csv/leak-scanner.mjs") {
    return true;
  }
  if (file === "scripts/check-boundaries.mjs") {
    return true;
  }
  if (file === "runtime/src/agents/isolation.ts") {
    return true;
  }
  if (file === "scripts/release-smoke.mjs") {
    return true;
  }
  if (file === "app/scripts/run-flow.mjs") {
    return true;
  }
  if (file === "app/scripts/manual-smoke-check.mjs") {
    return true;
  }
  if (file === "app/scripts/qa-check.mjs") {
    return true;
  }
  if (file === "app/scripts/preflight.mjs") {
    return true;
  }
  if (file === "app/src-tauri/src/commands.rs") {
    return (
      ruleId === "std_process_command_reference" ||
      line.includes("Command::new(program)") ||
      line.includes("app/scripts/run-flow.mjs") ||
      isEventLogLeakScannerLine(line) ||
      line.includes("DEEPSEEK_API_KEY") ||
      line.includes("OPENAI_API_KEY")
    );
  }
  if (file === "app/scripts/smoke.mjs") {
    return (
      line.includes("execFile") ||
      line.includes("DEEPSEEK_API_KEY") ||
      line.includes("OPENAI_API_KEY")
    );
  }
  if (file === "app/README.md") {
    return true;
  }
  if (file.startsWith("runtime/src/web/")) {
    return true;
  }
  if (
    file ===
      "runtime/src/capabilities/external-capability-broker-integration.ts" &&
    ruleId === "raw_prompt_reference" &&
    line.includes("RAW_PROMPT_FIELD_REJECTED")
  ) {
    return true;
  }
  if (isDesktopObserverProfileDenylist(file, ruleId)) {
    return true;
  }
  if (isDesktopObserverCommandDenylist(file, line, ruleId)) {
    return true;
  }
  if (file === "browser-extension/src/payload.ts") {
    return true;
  }
  if (file === "browser-extension/src/capture-visible-tables.ts") {
    return (
      ruleId === "query_selector_all_reference" ||
      ruleId === "get_elements_by_tag_name_reference" ||
      line.includes("cookiesAccessed") ||
      line.includes("rawDomIncluded")
    );
  }
  return false;
}

function isAllowedSecretHit(file, line, ruleId) {
  if (isBoundaryDoc(file)) {
    return true;
  }
  if (isTestFile(file)) {
    return true;
  }
  if (file === "scripts/check-boundaries.mjs") {
    return true;
  }
  if (file === "app/scripts/run-flow.mjs") {
    return true;
  }
  if (file === "app/scripts/manual-smoke-check.mjs") {
    return true;
  }
  if (file === "app/scripts/qa-check.mjs") {
    return true;
  }
  if (file === "app/scripts/preflight.mjs") {
    return true;
  }
  if (file === "app/src-tauri/src/commands.rs") {
    return true;
  }
  if (file === "app/scripts/smoke.mjs") {
    return true;
  }
  if (file === "conformance/src/live-runner.ts") {
    return true;
  }
  if (file === "conformance/README.md") {
    return true;
  }
  if (isLiveProposalOptInPolicyDisplayRef(file, line, ruleId)) {
    return true;
  }
  if (isDesktopObserverProfileSecretDenylist(file, ruleId)) {
    return true;
  }
  return false;
}

function checkMvpHardeningBoundaries(root, file, text) {
  const rel = toPosix(path.relative(root, file));
  if (
    rel === "scripts/check-boundaries.mjs" ||
    isBoundaryDoc(rel) ||
    isTestFile(rel)
  ) {
    return [];
  }

  const findings = [];
  const lines = text.split(/\r?\n/);
  const controlledApprovedCommandFiles = new Set([
    "app/src/desktop-flow.ts",
    "app/src-tauri/src/commands.rs",
    "app/src-tauri/src/main.rs"
  ]);
  const approvedExecutionCommands = [
    "apply_approved_user_workspace_patch",
    "rollback_approved_user_workspace_patch",
    "record_approved_user_workspace_execution_event"
  ];
  const sourceCanUseReadinessFlags =
    rel.startsWith("app/src/") || rel.startsWith("runtime/src/");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (
      approvedExecutionCommands.some((command) => line.includes(command)) &&
      !controlledApprovedCommandFiles.has(rel)
    ) {
      findings.push({
        file: rel,
        line: index + 1,
        ruleId: "approved_execution_command_outside_controlled_lane"
      });
    }

    if (
      rel.startsWith("app/src/") &&
      rel !== "app/src/desktop-flow.ts" &&
      /\bsafeInvoke\s*\(|\binvoke\s*\(/.test(line)
    ) {
      findings.push({
        file: rel,
        line: index + 1,
        ruleId: "app_tauri_invoke_outside_desktop_flow"
      });
    }

    if (
      sourceCanUseReadinessFlags &&
      /\b(nativeBridge|desktopAction)\s*:\s*true\b/.test(line)
    ) {
      findings.push({
        file: rel,
        line: index + 1,
        ruleId: "native_bridge_or_desktop_action_enabled"
      });
    }

    if (
      sourceCanUseReadinessFlags &&
      /\b(canApplyPatch|canRollback|canWriteEventStore|canExecuteGit|canExecuteShell|appCanExecute|canCallDeepSeekFromApp|canReadApiKeyFromApp|canFetchNetworkFromApp|canSendLiveRequest|canApprove|canReject|canIssuePermissionLease)\s*:\s*true\b/.test(
        line
      )
    ) {
      findings.push({
        file: rel,
        line: index + 1,
        ruleId: "execution_readiness_enabled_in_preview_source"
      });
    }
  }

  return findings;
}

function isLiveProposalOptInPolicyDisplayRef(file, line, ruleId) {
  // ACCEPTABLE_LIVE_PROPOSAL_OPT_IN_POLICY: metadata refs only, never key reads.
  return (
    ruleId === "deepseek_env_reference" &&
    !line.includes("process.env") &&
    (file === "app/src/live-proposal-opt-in-gate-view.ts" ||
      file === "app/src/live-proposal-request-builder-view.ts" ||
      file === "app/src/App.tsx") &&
    line.includes("DEEPSEEK_API_KEY") &&
    (line.includes("allowedEnvVarNames") || line.includes("ref only"))
  );
}

function isDesktopObserverProfileDenylist(file, ruleId) {
  // ACCEPTABLE_DESKTOP_OBSERVER_PROFILE_DENYLIST: forbidden field names only.
  return (
    isDesktopObserverSchemaFile(file) &&
    [
      "raw_prompt_reference",
      "raw_dom_reference",
      "raw_screenshot_reference",
      "clipboard_reference"
    ].includes(ruleId)
  );
}

function isDesktopObserverProfileSecretDenylist(file, ruleId) {
  // ACCEPTABLE_DESKTOP_OBSERVER_PROFILE_DENYLIST: env names are blocked markers.
  return (
    isDesktopObserverSchemaFile(file) &&
    ["deepseek_env_reference", "openai_env_reference"].includes(ruleId)
  );
}

function isDesktopObserverCommandDenylist(file, line, ruleId) {
  // ACCEPTABLE_DESKTOP_OBSERVER_COMMAND_DENYLIST: fixed metadata command rejects these fields.
  return (
    (file === "app/src/desktop-flow.ts" ||
      file === "app/src-tauri/src/commands.rs") &&
    [
      "raw_prompt_reference",
      "raw_dom_reference",
      "raw_screenshot_reference",
      "clipboard_reference"
    ].includes(ruleId) &&
    (line.includes("DesktopObservation") ||
      line.includes("desktopObservation") ||
      line.includes("desktop_observer") ||
      line.includes("rawScreenshot") ||
      line.includes("raw_screenshot") ||
      line.includes("Clipboard") ||
      line.includes("clipboard"))
  );
}

function isDesktopObserverSchemaFile(file) {
  return (
    file === "runtime/src/desktop-observer/desktop-observation-profile.ts" ||
    file === "runtime/src/desktop-observer/desktop-observation-summary.ts"
  );
}

function isEventLogLeakScannerLine(line) {
  return /\b[A-Z0-9_]+_MARKER\b/.test(line);
}

function isBoundaryDoc(file) {
  return (
    file === "README.md" ||
    file === "SECURITY.md" ||
    file === "CONTRIBUTING.md" ||
    file.endsWith("/README.md") ||
    file.startsWith("docs/") ||
    file === "conformance/README.md" ||
    file === "evals/web-table-to-csv/README.md"
  );
}

function isTestFile(file) {
  return file.includes("/test/") || file.includes(".test.");
}

export async function listCheckableFiles(root = repoRoot) {
  const resolvedRoot = path.resolve(root);
  const gitFiles = await listGitFiles(resolvedRoot);
  if (gitFiles !== undefined) {
    return filterCheckableFiles(resolvedRoot, gitFiles);
  }

  const files = [];
  await walk(resolvedRoot, resolvedRoot, files);
  return files;
}

async function listTextFiles(root) {
  return listCheckableFiles(root);
}

async function listGitFiles(root) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 20_000_000
      }
    );
    return stdout
      .split("\0")
      .filter((value) => value.length > 0)
      .map((relativePath) => path.resolve(root, relativePath));
  } catch {
    return undefined;
  }
}

async function filterCheckableFiles(root, files) {
  const filtered = [];
  for (const file of files) {
    const relativePath = toPosix(path.relative(root, file));
    if (!isCheckableRelativePath(relativePath)) {
      continue;
    }
    const fileStat = await stat(file).catch(() => undefined);
    if (
      fileStat !== undefined &&
      fileStat.isFile() &&
      fileStat.size <= maxTextFileBytes
    ) {
      filtered.push(file);
    }
  }
  return filtered;
}

function isCheckableRelativePath(relativePath) {
  if (
    relativePath.length === 0 ||
    relativePath.startsWith("../") ||
    path.isAbsolute(relativePath)
  ) {
    return false;
  }
  if (ignoredFiles.has(path.basename(relativePath))) {
    return false;
  }
  if (!textExtensions.has(path.extname(relativePath))) {
    return false;
  }
  if (
    ignoredRelativePathPrefixes.some((prefix) =>
      relativePath.startsWith(prefix)
    )
  ) {
    return false;
  }
  return relativePath
    .split("/")
    .every((segment) => !ignoredDirectoryNames.has(segment));
}

async function walk(root, directory, files) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectoryNames.has(entry.name)) {
        await walk(root, absolutePath, files);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }
    const relativePath = toPosix(path.relative(root, absolutePath));
    if (!isCheckableRelativePath(relativePath)) {
      continue;
    }

    const fileStat = await stat(absolutePath);
    if (fileStat.size <= maxTextFileBytes) {
      files.push(absolutePath);
    }
  }
}

function finishCheck(label, findings, options) {
  const result = {
    ok: findings.length === 0,
    findings
  };

  if (!options.silent) {
    console.log(label);
    console.log(`status: ${result.ok ? "PASS" : "FAIL"}`);
    console.log(`findings: ${findings.length}`);
    for (const finding of findings.slice(0, 20)) {
      console.log(
        `${finding.file}:${finding.line} ${finding.ruleId}${
          finding.detail ? ` ${finding.detail}` : ""
        }`
      );
    }
  }

  return result;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function main() {
  const mode = process.argv[2] ?? "boundaries";
  const result =
    mode === "secrets"
      ? await runSecretCheck()
      : mode === "boundaries"
        ? await runBoundaryCheck()
        : null;

  if (result === null) {
    console.error(
      "Usage: node scripts/check-boundaries.mjs boundaries|secrets"
    );
    process.exitCode = 2;
    return;
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
