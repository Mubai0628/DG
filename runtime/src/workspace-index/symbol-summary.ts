import {
  type WorkspaceLanguage,
  type WorkspaceSymbolKind,
  type WorkspaceSymbolSummary
} from "./types.js";

const DEFAULT_MAX_SYMBOLS_PER_FILE = 24;

export function extractWorkspaceSymbolSummaries(
  input: {
    path: string;
    content: string;
    language: WorkspaceLanguage;
  },
  options: {
    maxSymbolsPerFile?: number;
  } = {}
): WorkspaceSymbolSummary[] {
  const maxSymbolsPerFile =
    options.maxSymbolsPerFile ?? DEFAULT_MAX_SYMBOLS_PER_FILE;
  const symbols: WorkspaceSymbolSummary[] = [];

  const add = (name: string, kind: WorkspaceSymbolKind): void => {
    if (symbols.length >= maxSymbolsPerFile) {
      return;
    }
    const safeName = sanitizeSymbolName(name);
    if (safeName.length === 0) {
      return;
    }
    if (
      symbols.some((symbol) => symbol.name === safeName && symbol.kind === kind)
    ) {
      return;
    }
    symbols.push({
      filePath: input.path,
      name: safeName,
      kind,
      language: input.language
    });
  };

  if (["ts", "tsx", "js", "jsx"].includes(input.language)) {
    collectRegex(
      input.content,
      /\bexport\s+function\s+([A-Za-z_$][\w$]*)/g,
      (name) => add(name, "function")
    );
    collectRegex(
      input.content,
      /\bexport\s+class\s+([A-Za-z_$][\w$]*)/g,
      (name) => add(name, "class")
    );
    collectRegex(
      input.content,
      /\bexport\s+const\s+([A-Z][A-Za-z0-9_$]*)/g,
      (name) => add(name, "const")
    );
    return symbols;
  }

  if (input.language === "java") {
    collectRegex(
      input.content,
      /\b(class|interface|enum)\s+([A-Za-z_]\w*)/g,
      (_kind, name) => add(name, _kind as WorkspaceSymbolKind)
    );
    collectRegex(
      input.content,
      /\bpublic\s+(?:static\s+)?(?:[\w<>.,?]+\s+)+([A-Za-z_]\w*)\s*\(/g,
      (name) => add(name, "method")
    );
    return symbols;
  }

  if (input.language === "md") {
    collectRegex(input.content, /^(#{1,6})\s+(.+)$/gm, (_level, heading) =>
      add(heading, "heading")
    );
    return symbols;
  }

  if (input.language === "json") {
    try {
      const parsed = JSON.parse(input.content) as unknown;
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        for (const key of Object.keys(parsed as Record<string, unknown>).sort(
          (left, right) => left.localeCompare(right)
        )) {
          add(key, "json_key");
        }
      }
    } catch {
      return symbols;
    }
    return symbols;
  }

  if (input.language === "rs") {
    collectRegex(input.content, /\bpub\s+fn\s+([A-Za-z_]\w*)/g, (name) =>
      add(name, "function")
    );
    collectRegex(input.content, /\bpub\s+struct\s+([A-Za-z_]\w*)/g, (name) =>
      add(name, "struct")
    );
    collectRegex(input.content, /\bpub\s+enum\s+([A-Za-z_]\w*)/g, (name) =>
      add(name, "enum")
    );
  }

  return symbols;
}

function collectRegex(
  content: string,
  pattern: RegExp,
  visitor: (...matches: string[]) => void
): void {
  for (const match of content.matchAll(pattern)) {
    visitor(...match.slice(1));
  }
}

function sanitizeSymbolName(value: string): string {
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}\b/gi, "[redacted]")
    .replace(/\s+/g, " ")
    .replace(/[<>`$]/g, "")
    .trim()
    .slice(0, 80);
}
