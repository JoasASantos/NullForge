import { useState } from "react";
import { Network, Globe, Scan, Search } from "lucide-react";
import { PortScanner } from "./PortScanner";
import { HttpRepeater } from "./HttpRepeater";
import { DnsLookup } from "./DnsLookup";

type NetworkTab = "scanner" | "repeater" | "dns";

const TABS: { id: NetworkTab; label: string; icon: React.ReactNode }[] = [
  { id: "scanner", label: "Port Scanner", icon: <Scan size={12} /> },
  { id: "repeater", label: "HTTP Repeater", icon: <Globe size={12} /> },
  { id: "dns", label: "DNS Lookup", icon: <Search size={12} /> },
];

export function NetworkToolsPanel() {
  const [activeTab, setActiveTab] = useState<NetworkTab>("scanner");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-border flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors flex-1 justify-center ${
              activeTab === tab.id
                ? "border-accent-red text-accent-red bg-accent-red/5"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "scanner" && <PortScanner />}
        {activeTab === "repeater" && <HttpRepeater />}
        {activeTab === "dns" && <DnsLookup />}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border px-3 py-1.5 flex items-center gap-1.5">
        <Network size={10} className="text-text-muted" />
        <span className="text-xs text-text-muted">
          Network tools run in-browser. For full nmap integration, use the Shell.
        </span>
      </div>
    </div>
  );
}
