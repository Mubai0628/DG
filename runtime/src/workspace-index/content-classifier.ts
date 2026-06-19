import { byteLengthUtf8 } from "./hash.js";
import {
  type WorkspaceContentClassification,
  type WorkspaceLanguage,
  type WorkspaceVirtualFile
} from "./types.js";

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;

const secretPatterns: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bBearer\s+[A-Za-z0-9._-]{16,}\b/i,
  /\bAuthorization\s*[:=]/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b[A-Z0-9_]*(API_KEY|TOKEN|SECRET|AUTHORIZATION|PASSWORD|BEARER)[A-Z0-9_]*\b/,
  /https?:\/\/\S+\?(?=\S*(token|key|secret|auth|password))/i
];

const rawMarkerPatterns: readonly RegExp[] = [
  /\brawPrompt\b/i,
  /\brawDom\b/i,
  /\brawScreenshot\b/i,
  /\bclipboard\b/i
];

export function classifyWorkspaceFileContent(
  file: WorkspaceVirtualFile,
  options: {
    maxFileBytes?: number;
  } = {}
): WorkspaceContentClassification {
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const content = file.content;
  const sizeBytes = file.sizeBytes ?? byteLengthUtf8(content);
  const extension = extensionOf(file.path);
  const language = guessWorkspaceLanguage(extension, file.path);
  const lineCount = countLines(content);
  const warningCodes: string[] = [];
  const binary = isBinaryLike(content);
  const secretRisk = secretPatterns.some((pattern) => pattern.test(content));
  const rawMarkerRisk = rawMarkerPatterns.some((pattern) =>
    pattern.test(content)
  );
  const tooLarge = sizeBytes > maxFileBytes;

  let skippedReason: string | undefined;
  if (binary) {
    skippedReason = "binary_content";
    warningCodes.push("binary_content");
  } else if (tooLarge) {
    skippedReason = "file_too_large";
    warningCodes.push("file_too_large");
  } else if (secretRisk) {
    skippedReason = "secret_marker";
    warningCodes.push("secret_marker");
  } else if (rawMarkerRisk) {
    skippedReason = "raw_marker";
    warningCodes.push("raw_marker");
  }

  const classification: WorkspaceContentClassification = {
    contentType: binary ? "binary" : "text",
    extension,
    language,
    sizeBytes,
    lineCount,
    secretRisk,
    rawMarkerRisk,
    tooLarge,
    warningCodes
  };
  if (skippedReason !== undefined) {
    classification.skippedReason = skippedReason;
  }
  return classification;
}

export function guessWorkspaceLanguage(
  extension: string,
  path: string
): WorkspaceLanguage {
  const lowerPath = path.toLowerCase();
  if (extension === "ts") {
    return "ts";
  }
  if (extension === "tsx") {
    return "tsx";
  }
  if (extension === "js") {
    return "js";
  }
  if (extension === "jsx") {
    return "jsx";
  }
  if (extension === "md" || lowerPath.endsWith(".markdown")) {
    return "md";
  }
  if (extension === "json") {
    return "json";
  }
  if (extension === "java") {
    return "java";
  }
  if (extension === "rs") {
    return "rs";
  }
  if (["yml", "yaml"].includes(extension)) {
    return "yaml";
  }
  if (extension === "css") {
    return "css";
  }
  if (["html", "htm"].includes(extension)) {
    return "html";
  }
  return "unknown";
}

export function extensionOf(path: string): string {
  const basename = path.split("/").pop() ?? path;
  const dot = basename.lastIndexOf(".");
  if (dot <= 0 || dot === basename.length - 1) {
    return "";
  }
  return basename.slice(dot + 1).toLowerCase();
}

function countLines(content: string): number {
  if (content.length === 0) {
    return 0;
  }
  return content.split(/\r\n|\r|\n/).length;
}

function isBinaryLike(content: string): boolean {
  if (content.includes("\0")) {
    return true;
  }
  if (content.length === 0) {
    return false;
  }

  let controlCount = 0;
  for (const char of content) {
    const code = char.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      controlCount += 1;
    }
  }
  return controlCount / content.length > 0.08;
}
