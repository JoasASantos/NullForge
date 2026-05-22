// Shared TypeScript types that mirror the Rust PluginManifest / PluginState structs.

export interface PluginCommand {
  id: string;
  title: string;
}

export interface PluginPanel {
  id: string;
  title: string;
  location: string;
}

export interface PluginContributes {
  commands: PluginCommand[];
  panels: PluginPanel[];
}

export interface PluginManifest {
  name: string;
  id: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  license?: string;
  repository?: string;
  homepage?: string;
  permissions: string[];
  contributes: PluginContributes;
  enabled?: boolean;
}

export interface PluginState {
  manifest: PluginManifest;
  enabled: boolean;
  installed: boolean;
  has_update: boolean;
  plugin_dir: string;
}
