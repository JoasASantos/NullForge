import {
  BookOpen,
  Database,
  FolderOpen,
  Search,
  Settings,
  Skull,
  User,
} from "lucide-react";
import { type ActivePanel, useAppStore } from "../../store";

interface NavItem {
  id: ActivePanel;
  icon: React.ReactNode;
  tooltip: string;
}

const topItems: NavItem[] = [
  { id: "explorer",  icon: <FolderOpen size={20} />, tooltip: "Explorer" },
  { id: "search",    icon: <Search size={20} />,     tooltip: "Search" },
  { id: "payloads",  icon: <Skull size={20} />,       tooltip: "Payload Library" },
  { id: "exploitdb", icon: <Database size={20} />,    tooltip: "Exploit DB" },
  { id: "sysapi",    icon: <BookOpen size={20} />,    tooltip: "Syscall / API Reference" },
];

export function ActivityBar() {
  const { activePanel, setActivePanel } = useAppStore();

  return (
    <div className="flex flex-col w-12 h-full bg-surface border-r border-border flex-shrink-0">
      {/* Top nav items */}
      <div className="flex flex-col items-center gap-1 pt-2 flex-1">
        {topItems.map((item) => (
          <button
            key={item.id}
            title={item.tooltip}
            onClick={() => setActivePanel(item.id)}
            className={`
              w-10 h-10 flex items-center justify-center rounded
              transition-colors duration-100
              ${
                activePanel === item.id
                  ? "text-text-primary bg-elevated border-l-2 border-accent-red"
                  : "text-text-muted hover:text-text-primary hover:bg-elevated"
              }
            `}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* Bottom items */}
      <div className="flex flex-col items-center gap-1 pb-2">
        <button
          title="Settings"
          onClick={() => window.dispatchEvent(new CustomEvent("nullforge:open-settings"))}
          className="w-10 h-10 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
        >
          <Settings size={20} />
        </button>
        <button
          title="Profile"
          className="w-10 h-10 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
        >
          <User size={20} />
        </button>
      </div>
    </div>
  );
}
