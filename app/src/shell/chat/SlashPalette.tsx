import { useT } from "../i18n/index.js";

export type SlashCommandItem = {
  name: string;
  descriptionKey: string;
  usageKey: string;
};

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    name: "/read",
    descriptionKey: "Read a file from the workspace",
    usageKey: "/read <path>"
  },
  {
    name: "/convert",
    descriptionKey: "Convert a captured web table to CSV",
    usageKey: "/convert <file.csv>"
  },
  {
    name: "/broker",
    descriptionKey: "Run a command through the broker",
    usageKey: "/broker <command>"
  },
  {
    name: "/verify",
    descriptionKey: "Run a fixed verification template",
    usageKey: "/verify [template]"
  },
  {
    name: "/git",
    descriptionKey: "Read summary git state",
    usageKey: "/git [status|diff|log|branch]"
  }
];

export function filterSlashCommands(text: string): SlashCommandItem[] {
  const query = text.trimStart().toLowerCase();
  if (!query.startsWith("/")) {
    return [];
  }
  if (query.includes(" ") || query === "/") {
    return query === "/" ? SLASH_COMMANDS : [];
  }
  return SLASH_COMMANDS.filter((command) => command.name.startsWith(query));
}

export function SlashPalette({
  text,
  onPick
}: {
  text: string;
  onPick: (command: SlashCommandItem) => void;
}) {
  const t = useT();
  const commands = filterSlashCommands(text);
  if (commands.length === 0) {
    return null;
  }
  return (
    <div className="slashPalette" role="listbox" aria-label={t("Quick tools")}>
      {commands.map((command) => (
        <button
          key={command.name}
          type="button"
          role="option"
          aria-selected="false"
          className="slashItem"
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(command);
          }}
        >
          <code>{command.name}</code>
          <span className="muted" style={{ marginLeft: 8 }}>
            {t(command.descriptionKey)} · {command.usageKey}
          </span>
        </button>
      ))}
    </div>
  );
}
