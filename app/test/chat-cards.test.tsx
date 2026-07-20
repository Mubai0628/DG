import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ApprovalCard } from "../src/shell/chat/ApprovalCard.js";
import { ToolCard } from "../src/shell/chat/ToolCard.js";
import { LanguageProvider } from "../src/shell/i18n/index.js";

describe("chat tool cards", () => {
  it("renders an approval card with lease selection and disabled approve until the phrase matches", () => {
    const html = renderToString(
      <LanguageProvider language="en">
        <ApprovalCard
          reason="Broker execution requires approval."
          phrase="EXECUTE WORKSPACE COMMAND"
          needsLease={true}
          leaseOptions={[
            { leaseId: "lease-1", mode: "full_access_mode", status: "active" }
          ]}
          onApprove={() => undefined}
          onCancel={() => undefined}
        />
      </LanguageProvider>
    );

    expect(html).toContain("approval required");
    expect(html).toContain("EXECUTE WORKSPACE COMMAND");
    expect(html).toContain("lease-1");
    expect(html).toContain("Approve &amp; run");
  });

  it("renders the approval card in Chinese by default", () => {
    const html = renderToString(
      <ApprovalCard
        reason="Broker execution requires approval."
        phrase="EXECUTE WORKSPACE COMMAND"
        needsLease={false}
        leaseOptions={[]}
        onApprove={() => undefined}
        onCancel={() => undefined}
      />
    );

    expect(html).toContain("需要审批");
    expect(html).toContain("输入批准短语");
    expect(html).toContain("批准并运行");
    expect(html).toContain("EXECUTE WORKSPACE COMMAND");
  });

  it("explains the next step when no lease is available", () => {
    const html = renderToString(
      <LanguageProvider language="en">
        <ApprovalCard
          reason="Full access requires a lease."
          phrase="EXECUTE WORKSPACE COMMAND"
          needsLease={true}
          leaseOptions={[]}
          onApprove={() => undefined}
          onCancel={() => undefined}
        />
      </LanguageProvider>
    );

    expect(html).toContain("No active full-access lease");
  });

  it("renders done and error tool card states", () => {
    const done = renderToString(
      <LanguageProvider language="en">
        <ToolCard
          item={{
            id: "t1",
            kind: "tool",
            tool: "verify",
            title: "/verify typecheck",
            state: { phase: "done", summary: "passed · exit 0" }
          }}
        />
      </LanguageProvider>
    );
    const failed = renderToString(
      <LanguageProvider language="en">
        <ToolCard
          item={{
            id: "t2",
            kind: "tool",
            tool: "read",
            title: "/read notes/a.txt",
            state: { phase: "error", message: "WORKSPACE_FILE_NOT_FOUND" }
          }}
        />
      </LanguageProvider>
    );

    expect(done).toContain("Shell verification lane");
    expect(done).toContain("passed · exit 0");
    expect(done).toContain("done");
    expect(failed).toContain("WORKSPACE_FILE_NOT_FOUND");
    expect(failed).toContain("error");
  });
});
