import { useT } from "../i18n/index.js";

export function ModelSettings() {
  const t = useT();
  return (
    <>
      <h2 className="sectionTitle">{t("Model & Proposals")}</h2>
      <div className="card">
        <div className="cardTitle">{t("DeepSeek live proposals")}</div>
        <p className="muted">
          {t(
            "Live DeepSeek patch proposal generation is available through the fixed lane with its own session receipt and typed confirmation (CALL DEEPSEEK FOR PROPOSAL). The API key is only read from the DeepSeek API key environment variable, never stored."
          )}
        </p>
        <p className="muted">
          {t(
            "The conversation-integrated proposal flow arrives with the chat tools in P2/P3. Nothing is called live without your explicit opt-in."
          )}
        </p>
      </div>
    </>
  );
}
