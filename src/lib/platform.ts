// Platform detection and shortcut display utilities

export type Platform = "mac" | "windows" | "linux";

let _platform: Platform | null = null;

export function getPlatform(): Platform {
  if (_platform) return _platform;
  const ua = navigator.userAgent;
  if (/Mac/.test(ua)) _platform = "mac";
  else if (/Win/.test(ua)) _platform = "windows";
  else _platform = "linux";
  return _platform;
}

export const isMac     = () => getPlatform() === "mac";
export const isWindows = () => getPlatform() === "windows";
export const isLinux   = () => getPlatform() === "linux";

// Apply platform class to <html> for CSS font targeting
export function applyPlatformClass() {
  const p = getPlatform();
  document.documentElement.classList.remove("platform-mac", "platform-windows", "platform-linux");
  document.documentElement.classList.add(`platform-${p}`);
}

// Key symbol constants
export const MOD   = isMac() ? "⌘" : "Ctrl";
export const ALT   = isMac() ? "⌥" : "Alt";
export const SHIFT = "⇧";
export const CTRL  = "⌃"; // raw Ctrl on Mac (separate from ⌘)

// Return the correct keys array for current platform
export function keys(mac: string[], win: string[]): string[] {
  return isMac() ? mac : win;
}

// Check if a KeyboardEvent matches a shortcut defined as {mac, win}
export function matchesShortcut(
  e: KeyboardEvent,
  mac: { mod?: boolean; shift?: boolean; alt?: boolean; ctrl?: boolean; key: string },
  win: { mod?: boolean; shift?: boolean; alt?: boolean; key: string },
): boolean {
  if (isMac()) {
    const { mod, shift, alt, ctrl, key } = mac;
    return (
      (mod    ? e.metaKey  : !e.metaKey)  &&
      (shift  ? e.shiftKey : !e.shiftKey) &&
      (alt    ? e.altKey   : !e.altKey)   &&
      (ctrl   ? e.ctrlKey  : !e.ctrlKey)  &&
      e.key.toLowerCase() === key.toLowerCase()
    );
  }
  const { mod, shift, alt, key } = win;
  return (
    (mod    ? e.ctrlKey  : !e.ctrlKey)  &&
    (shift  ? e.shiftKey : !e.shiftKey) &&
    (alt    ? e.altKey   : !e.altKey)   &&
    !e.metaKey &&
    e.key.toLowerCase() === key.toLowerCase()
  );
}
