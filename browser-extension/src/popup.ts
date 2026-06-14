import { captureVisibleTables } from "./capture-visible-tables.js";
import { formatPreview, type CaptureResult } from "./payload.js";

type ChromeTab = {
  id?: number;
};

type ChromeExecuteScriptResult = {
  result?: CaptureResult;
};

type ChromeLike = {
  runtime?: {
    lastError?: {
      message?: string;
    };
  };
  tabs: {
    query(
      queryInfo: { active: true; currentWindow: true },
      callback: (tabs: ChromeTab[]) => void
    ): void;
  };
  scripting: {
    executeScript(
      injection: {
        target: { tabId: number };
        func: () => CaptureResult;
      },
      callback: (results: ChromeExecuteScriptResult[]) => void
    ): void;
  };
};

declare const chrome: ChromeLike;

const captureButton = globalThis.document.getElementById("capture");
const summaryElement = globalThis.document.getElementById("summary");
const previewElement = globalThis.document.getElementById("preview");

if (
  captureButton instanceof HTMLButtonElement &&
  summaryElement !== null &&
  previewElement instanceof HTMLTextAreaElement
) {
  captureButton.addEventListener("click", () => {
    void runCapture(captureButton, summaryElement, previewElement);
  });
}

async function runCapture(
  button: HTMLButtonElement,
  summary: HTMLElement,
  preview: HTMLTextAreaElement
): Promise<void> {
  button.disabled = true;
  summary.textContent = "Capturing visible tables...";
  preview.value = "";

  try {
    const result = await captureActiveTab();
    const formatted = formatPreview(result);
    summary.textContent = formatted.summary;
    preview.value = formatted.jsonPreview;
  } catch (error) {
    summary.textContent = "Capture failed";
    preview.value = JSON.stringify(
      {
        ok: false,
        errorKind: "capture_failed",
        message: error instanceof Error ? error.message : "Capture failed"
      },
      null,
      2
    );
  } finally {
    button.disabled = false;
  }
}

function captureActiveTab(): Promise<CaptureResult> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId === undefined) {
        reject(new Error("No active tab was available"));
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId },
          func: captureVisibleTables
        },
        (results) => {
          const errorMessage = chrome.runtime?.lastError?.message;
          if (errorMessage !== undefined) {
            reject(new Error(errorMessage));
            return;
          }

          const result = results[0]?.result;
          if (result === undefined) {
            reject(new Error("No capture result was returned"));
            return;
          }
          resolve(result);
        }
      );
    });
  });
}
