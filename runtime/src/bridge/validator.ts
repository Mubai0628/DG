import { BrowserPayloadValidationError } from "../web/errors.js";
import {
  summarizePayloadSource,
  validateBrowserDomPayload
} from "../web/browser-payload-contract.js";
import { extractTablesFromPayload } from "../web/table-extractor.js";
import { type BridgePayloadProposal, type BridgeRiskSummary } from "./types.js";
import { BridgeProtocolError, bridgeError } from "./errors.js";
import { isRecord, jsonByteLength, readOptionalString } from "./protocol.js";

export type BridgePayloadValidationOptions = {
  maxPayloadBytes: number;
  allowedExtensionIds?: readonly string[] | undefined;
};

export function validateBridgePayloadProposal(
  proposal: unknown,
  options: BridgePayloadValidationOptions
): BridgeRiskSummary {
  if (!isRecord(proposal)) {
    throw new BridgeProtocolError(
      bridgeError(
        "payload_invalid",
        "Bridge payload proposal must be an object",
        {
          stage: "payload"
        }
      )
    );
  }

  const payload = proposal.payload;
  const payloadBytes = jsonByteLength(payload);
  if (payloadBytes > options.maxPayloadBytes) {
    throw new BridgeProtocolError(
      bridgeError("payload_too_large", "Bridge payload proposal is too large", {
        stage: "payload"
      })
    );
  }

  try {
    const validated = validateBrowserDomPayload(payload);
    const extraction = extractTablesFromPayload(validated);
    const source = summarizePayloadSource(validated.source);
    const identityWarnings = summarizeIdentityWarnings(proposal, options);
    const summary: BridgeRiskSummary = {
      sourceHost: source.sourceHost,
      sourcePathWithoutQuery: source.sourcePathWithoutQuery,
      tableCount: validated.tables.length,
      selectedTableId: extraction.selectedTable.id,
      rowCount: extraction.selectedTable.rowCount,
      columnCount: extraction.selectedTable.columnCount,
      warningCount: extraction.warnings.length,
      injectionRiskCount: extraction.injectionRisks.length,
      warningCodes: extraction.warnings.map((warning) => warning.code),
      injectionRiskHashes: extraction.injectionRisks.map(
        (risk) => risk.snippetHash
      ),
      payloadBytes,
      identityWarnings,
      previewRequired: true,
      autoConvert: false,
      fileWritten: false,
      eventWritten: false
    };
    const extensionId = readOptionalString(proposal, "extensionId");
    if (extensionId !== undefined) {
      summary.extensionId = extensionId;
    }
    const extensionVersion = readOptionalString(proposal, "extensionVersion");
    if (extensionVersion !== undefined) {
      summary.extensionVersion = extensionVersion;
    }
    const sourceOrigin = readOptionalString(proposal, "sourceOrigin");
    if (sourceOrigin !== undefined) {
      summary.sourceOrigin = sourceOrigin;
    }
    return summary;
  } catch (error) {
    if (error instanceof BridgeProtocolError) {
      throw error;
    }
    if (error instanceof BrowserPayloadValidationError) {
      throw new BridgeProtocolError(
        bridgeError("payload_invalid", error.message, { stage: "payload" })
      );
    }
    throw new BridgeProtocolError(
      bridgeError("payload_invalid", "Bridge payload proposal is invalid", {
        stage: "payload"
      })
    );
  }
}

function summarizeIdentityWarnings(
  proposal: Record<string, unknown>,
  options: BridgePayloadValidationOptions
): string[] {
  const extensionId = readOptionalString(proposal, "extensionId");
  if (extensionId === undefined) {
    return ["unknown_extension_id"];
  }
  if (options.allowedExtensionIds === undefined) {
    return ["extension_id_unverified"];
  }
  if (!options.allowedExtensionIds.includes(extensionId)) {
    return ["unknown_extension_id"];
  }
  return [];
}

export function bridgePayloadProposal(
  payload: BridgePayloadProposal
): BridgePayloadProposal {
  return payload;
}
