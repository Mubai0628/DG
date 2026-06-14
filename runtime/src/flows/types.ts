import {
  type BrowserDomPayload,
  type UntrustedContentWarning
} from "../web/index.js";

export type WebTableToCsvFlowInput = {
  workspaceRoot: string;
  payload: BrowserDomPayload;
  eventLogPath?: string;
  filename?: string;
  tableId?: string;
  allowOverwrite?: boolean;
  clock?: () => Date;
  idFactory?: () => string;
};

export type WebTableToCsvFlowResult = {
  draft: {
    relativePath: string;
    absolutePath: string;
    bytes: number;
    sha256: string;
    contentType: "text/csv";
  };
  extraction: {
    sourceHost: string;
    sourcePathWithoutQuery: string;
    tableId: string;
    rowCount: number;
    columnCount: number;
    warningCount: number;
    injectionRiskCount: number;
    formulaEscapedCount: number;
  };
  events: {
    eventCount: number;
    eventLogPath: string;
  };
  replaySummary: {
    eventCount: number;
    draftCount: number;
    tasks: Record<string, string>;
  };
  warnings: UntrustedContentWarning[];
};
