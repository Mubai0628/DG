const cjkPattern =
  /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g;

export function estimateTokens(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  const cjkMatches = text.match(cjkPattern);
  const cjkCount = cjkMatches?.length ?? 0;
  const nonCjkText = text.replace(cjkPattern, "");
  const nonCjkCount = nonCjkText.trim().length;
  const estimate = cjkCount + Math.ceil(nonCjkCount / 4);

  return Number.isFinite(estimate) ? estimate : 0;
}
