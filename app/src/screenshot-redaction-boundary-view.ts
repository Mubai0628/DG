import {
  buildScreenshotMetadataBoundary,
  summarizeScreenshotMetadataBoundary,
  type ScreenshotMetadataBoundaryInput,
  type ScreenshotMetadataBoundaryStatus
} from "../../runtime/src/desktop-observer/index.js";

export type ScreenshotRedactionBoundaryViewStatus =
  ScreenshotMetadataBoundaryStatus;

export type ScreenshotRedactionBoundaryViewReadiness = {
  canDisplayBoundary: boolean;
  canPersistRawImage: false;
  canPersistOcrText: false;
  canSendToModel: false;
  canCaptureRawImage: false;
  canDesktopAction: false;
  canClickTypeSelect: false;
  canWriteClipboard: false;
  canWriteEventStore: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ScreenshotRedactionBoundaryView = {
  status: ScreenshotRedactionBoundaryViewStatus;
  boundaryId?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  displayCount: number;
  pixelCountEstimate?: number | undefined;
  hashPrefix?: string | undefined;
  captureMode: "metadata_only";
  rawPersisted: false;
  ocrPersisted: false;
  modelSent: false;
  redactionCodes: string[];
  warningCodes: string[];
  blockerCodes: string[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  boundaryHash?: string | undefined;
  summaryOnly: true;
  readiness: ScreenshotRedactionBoundaryViewReadiness;
  nextAction: string;
  source: "app_screenshot_redaction_boundary_view";
};

export type ScreenshotRedactionBoundaryViewInput = {
  metadata?: ScreenshotMetadataBoundaryInput | undefined;
};

export function buildScreenshotRedactionBoundaryView(
  input: ScreenshotRedactionBoundaryViewInput = {}
): ScreenshotRedactionBoundaryView {
  const boundary = buildScreenshotMetadataBoundary(input.metadata);
  const summary = summarizeScreenshotMetadataBoundary(boundary);

  return {
    status: summary.status,
    boundaryId: summary.boundaryId,
    width: summary.width,
    height: summary.height,
    displayCount: summary.displayCount,
    pixelCountEstimate: summary.pixelCountEstimate,
    hashPrefix: summary.hashPrefix,
    captureMode: "metadata_only",
    rawPersisted: false,
    ocrPersisted: false,
    modelSent: false,
    redactionCodes: summary.redactionCodes,
    warningCodes: summary.warningCodes,
    blockerCodes: summary.blockerCodes,
    blockerCount: boundary.blockerCount,
    warningCount: boundary.warningCount,
    findingCount: boundary.findingCount,
    boundaryHash: summary.boundaryHash,
    summaryOnly: true,
    readiness: {
      canDisplayBoundary: boundary.readiness.canUseScreenshotMetadata,
      canPersistRawImage: false,
      canPersistOcrText: false,
      canSendToModel: false,
      canCaptureRawImage: false,
      canDesktopAction: false,
      canClickTypeSelect: false,
      canWriteClipboard: false,
      canWriteEventStore: false,
      canApplyPatch: false,
      canRollback: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: boundary.nextAction,
    source: "app_screenshot_redaction_boundary_view"
  };
}
