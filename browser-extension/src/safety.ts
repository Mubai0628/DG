export const browserExtensionV0Limits = {
  maxTables: 20,
  maxCells: 10_000,
  maxCellTextChars: 2_000,
  maxNearbyTextChars: 300,
  maxPayloadBytes: 1_000_000
} as const;

export const browserExtensionV0Capabilities = {
  activeTabVisibleTableCapture: true,
  automaticPageInjection: false,
  networkSend: false,
  fileWrite: false,
  pageMutation: false
} as const;
