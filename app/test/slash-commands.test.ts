import { describe, expect, it } from "vitest";

import { parseComposerInput } from "../src/shell/chat/slash-commands.js";

describe("parseComposerInput", () => {
  it("parses read commands", () => {
    expect(parseComposerInput("/read notes/hello.txt")).toEqual({
      kind: "read",
      relativePath: "notes/hello.txt"
    });
    expect(parseComposerInput("/read")).toEqual({
      kind: "unknown",
      input: "/read"
    });
  });

  it("parses convert commands", () => {
    expect(parseComposerInput("/convert drafts/out.csv")).toEqual({
      kind: "convert",
      filename: "drafts/out.csv"
    });
    expect(parseComposerInput("/convert")).toEqual({
      kind: "unknown",
      input: "/convert"
    });
  });

  it("parses broker commands with the full remainder as command text", () => {
    expect(parseComposerInput("/broker pnpm typecheck --watch false")).toEqual({
      kind: "broker",
      commandText: "pnpm typecheck --watch false"
    });
    expect(parseComposerInput("/broker")).toEqual({
      kind: "unknown",
      input: "/broker"
    });
  });

  it("parses verify templates with aliases and defaults", () => {
    expect(parseComposerInput("/verify")).toEqual({
      kind: "verify",
      templateId: "pnpm.typecheck"
    });
    expect(parseComposerInput("/verify lint")).toEqual({
      kind: "verify",
      templateId: "pnpm.lint"
    });
    expect(parseComposerInput("/verify cargo")).toEqual({
      kind: "verify",
      templateId: "cargo.check_tauri"
    });
    expect(parseComposerInput("/verify nope")).toEqual({
      kind: "unknown",
      input: "/verify nope"
    });
  });

  it("parses git lanes with aliases and defaults", () => {
    expect(parseComposerInput("/git")).toEqual({
      kind: "git",
      lane: "status_summary"
    });
    expect(parseComposerInput("/git diff")).toEqual({
      kind: "git",
      lane: "diff_summary"
    });
    expect(parseComposerInput("/git log_summary")).toEqual({
      kind: "git",
      lane: "log_summary"
    });
    expect(parseComposerInput("/git nope")).toEqual({
      kind: "unknown",
      input: "/git nope"
    });
  });

  it("passes non-slash text through as chat", () => {
    expect(parseComposerInput("hello there")).toEqual({
      kind: "chat",
      text: "hello there"
    });
  });

  it("marks unknown slash commands as unknown", () => {
    expect(parseComposerInput("/delete everything")).toEqual({
      kind: "unknown",
      input: "/delete everything"
    });
  });
});
