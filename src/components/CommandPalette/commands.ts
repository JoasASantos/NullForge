export type CommandCategory =
  | "file"
  | "view"
  | "debug"
  | "ai"
  | "shell"
  | "exploit"
  | "tools";

export interface Command {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  shortcut?: string;
  icon?: string;
  action: () => void;
}

// Defined at runtime with store access — populated by useCommands()
export type CommandRegistry = Command[];
