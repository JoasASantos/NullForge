import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

type RecordType = "A" | "AAAA" | "MX" | "TXT" | "CNAME" | "NS";

interface DnsRecord {
  type: string;
  name: string;
  data: string;
  TTL: number;
}

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

const TYPE_NAMES: Record<number, string> = {
  1: "A",
  28: "AAAA",
  5: "CNAME",
  15: "MX",
  16: "TXT",
  2: "NS",
  6: "SOA",
};

const RECORD_TYPES: RecordType[] = ["A", "AAAA", "MX", "TXT", "CNAME", "NS"];

export function DnsLookup() {
  const [domain, setDomain] = useState("");
  const [recordType, setRecordType] = useState<RecordType | "ALL">("A");
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function lookup() {
    if (!domain.trim()) return;
    setLoading(true);
    setError(null);
    setRecords([]);

    try {
      const typesToQuery: RecordType[] = recordType === "ALL" ? RECORD_TYPES : [recordType];
      const allRecords: DnsRecord[] = [];

      await Promise.all(
        typesToQuery.map(async (type) => {
          const url = `https://dns.google/resolve?name=${encodeURIComponent(
            domain.trim()
          )}&type=${type}`;
          const resp = await fetch(url, {
            headers: { Accept: "application/dns-json" },
          });
          if (!resp.ok) return;
          const data = await resp.json();
          const answers: DohAnswer[] = data.Answer ?? [];
          answers.forEach((a) => {
            allRecords.push({
              type: TYPE_NAMES[a.type] ?? String(a.type),
              name: a.name,
              data: a.data,
              TTL: a.TTL,
            });
          });
        })
      );

      if (allRecords.length === 0) {
        setError("No records found");
      } else {
        setRecords(allRecords);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="example.com"
          className="flex-1 bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red font-mono"
        />
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value as RecordType | "ALL")}
          className="bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-red"
        >
          <option value="ALL">ALL</option>
          {RECORD_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={lookup}
          disabled={loading || !domain.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/40 rounded transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          Lookup
        </button>
      </div>

      {error && (
        <div className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      {records.length > 0 && (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-elevated border-b border-border">
                <th className="text-left px-3 py-1.5 text-text-muted font-medium">Type</th>
                <th className="text-left px-3 py-1.5 text-text-muted font-medium">Name</th>
                <th className="text-left px-3 py-1.5 text-text-muted font-medium">Value</th>
                <th className="text-right px-3 py-1.5 text-text-muted font-medium">TTL</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-elevated/50">
                  <td className="px-3 py-1.5">
                    <span className="text-accent-green font-mono font-semibold">{r.type}</span>
                  </td>
                  <td className="px-3 py-1.5 text-text-muted font-mono truncate max-w-[80px]">
                    {r.name}
                  </td>
                  <td className="px-3 py-1.5 text-text-primary font-mono break-all">{r.data}</td>
                  <td className="px-3 py-1.5 text-text-muted text-right">{r.TTL}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && records.length === 0 && !error && (
        <div className="text-center text-xs text-text-muted py-6">
          Enter a domain and click Lookup
        </div>
      )}
    </div>
  );
}
