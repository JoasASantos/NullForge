import { useState } from "react";
import { Scan, Loader2 } from "lucide-react";

interface ScanResult {
  port: number;
  state: "open" | "closed" | "filtered";
  service: string;
}

// Common port → service name mapping for mock/fallback
const COMMON_SERVICES: Record<number, string> = {
  21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp", 53: "dns",
  80: "http", 110: "pop3", 143: "imap", 443: "https", 445: "smb",
  3306: "mysql", 3389: "rdp", 5432: "postgresql", 6379: "redis",
  8080: "http-alt", 8443: "https-alt", 9200: "elasticsearch", 27017: "mongodb",
};

function stateColor(state: ScanResult["state"]): string {
  if (state === "open") return "text-accent-green";
  if (state === "filtered") return "text-accent-yellow";
  return "text-text-muted";
}

export function PortScanner() {
  const [target, setTarget] = useState("");
  const [startPort, setStartPort] = useState("1");
  const [endPort, setEndPort] = useState("1024");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  async function runScan() {
    if (!target.trim()) return;
    setScanning(true);
    setResults([]);
    setError(null);
    setProgress(0);

    const start = Math.max(1, parseInt(startPort, 10) || 1);
    const end = Math.min(65535, parseInt(endPort, 10) || 1024);
    const total = end - start + 1;
    const found: ScanResult[] = [];

    // TCP connect scan via fetch heuristic
    // For each port we attempt a fetch to http://target:port with a short timeout
    // open ports on http services will respond, others will fail fast
    const BATCH = 20;
    const ports = Array.from({ length: total }, (_, i) => start + i);

    let done = 0;

    async function checkPort(port: number): Promise<void> {
      const service = COMMON_SERVICES[port] ?? "";
      let state: ScanResult["state"] = "filtered";

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);
        const protocol = port === 443 || port === 8443 ? "https" : "http";
        const resp = await fetch(`${protocol}://${target}:${port}`, {
          signal: controller.signal,
          mode: "no-cors",
        });
        clearTimeout(timeout);
        // If we got here (opaque response), port is open
        void resp;
        state = "open";
      } catch (e) {
        if (e instanceof Error) {
          // "Failed to fetch" with no abort = port refused = closed
          // AbortError = timeout = filtered
          state = e.name === "AbortError" ? "filtered" : "closed";
        }
      }

      if (state !== "closed") {
        found.push({ port, state, service: service || (state === "open" ? "unknown" : "") });
        setResults([...found].sort((a, b) => a.port - b.port));
      }

      done++;
      setProgress(Math.round((done / total) * 100));
    }

    // Process in batches
    for (let i = 0; i < ports.length; i += BATCH) {
      const batch = ports.slice(i, i + BATCH);
      await Promise.all(batch.map(checkPort));
      if (!scanning && i > 0) break; // allow cancellation in future
    }

    if (found.length === 0) {
      setError("No open or filtered ports found in range");
    }
    setScanning(false);
    setProgress(100);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="192.168.1.1 or host.com"
          className="flex-1 bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red font-mono"
        />
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-xs text-text-muted flex-shrink-0">Port range:</span>
        <input
          type="number"
          value={startPort}
          onChange={(e) => setStartPort(e.target.value)}
          min={1}
          max={65535}
          className="w-20 bg-bg-base border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-red font-mono"
        />
        <span className="text-xs text-text-muted">–</span>
        <input
          type="number"
          value={endPort}
          onChange={(e) => setEndPort(e.target.value)}
          min={1}
          max={65535}
          className="w-20 bg-bg-base border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-red font-mono"
        />
        <button
          onClick={runScan}
          disabled={scanning || !target.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/40 rounded transition-colors disabled:opacity-50 ml-auto"
        >
          {scanning ? <Loader2 size={12} className="animate-spin" /> : <Scan size={12} />}
          {scanning ? `${progress}%` : "Scan"}
        </button>
      </div>

      {scanning && (
        <div className="w-full bg-border rounded-full h-1 overflow-hidden">
          <div
            className="bg-accent-red h-1 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && !scanning && (
        <div className="text-xs text-text-muted bg-elevated border border-border rounded px-3 py-2">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-elevated border-b border-border">
                <th className="text-left px-3 py-1.5 text-text-muted font-medium">Port</th>
                <th className="text-left px-3 py-1.5 text-text-muted font-medium">State</th>
                <th className="text-left px-3 py-1.5 text-text-muted font-medium">Service</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.port} className="border-b border-border last:border-0 hover:bg-elevated/50">
                  <td className="px-3 py-1.5 font-mono text-text-primary">{r.port}</td>
                  <td className={`px-3 py-1.5 font-semibold ${stateColor(r.state)}`}>{r.state}</td>
                  <td className="px-3 py-1.5 text-text-muted">{r.service || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!scanning && results.length === 0 && !error && (
        <div className="text-center text-xs text-text-muted py-6">
          Enter a target and click Scan. Uses browser fetch — best for HTTP ports.
        </div>
      )}
    </div>
  );
}
