import { useState, useRef } from "react";
import { Send, Plus, Trash2, Clock, ChevronDown, ChevronRight } from "lucide-react";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";

interface Header {
  key: string;
  value: string;
}

interface HistoryEntry {
  method: HttpMethod;
  url: string;
  status: number;
  ms: number;
  time: string;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-accent-green",
  POST: "text-accent-yellow",
  PUT: "text-blue-400",
  DELETE: "text-accent-red",
  PATCH: "text-purple-400",
  OPTIONS: "text-text-muted",
  HEAD: "text-text-muted",
};

const BODY_METHODS: HttpMethod[] = ["POST", "PUT", "PATCH"];

function statusColor(code: number): string {
  if (code < 200) return "text-text-muted";
  if (code < 300) return "text-accent-green";
  if (code < 400) return "text-accent-yellow";
  return "text-accent-red";
}

function tryPrettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function HttpRepeater() {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("https://");
  const [headers, setHeaders] = useState<Header[]>([{ key: "Content-Type", value: "application/json" }]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseMs, setResponseMs] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<string | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<[string, string][]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showRespHeaders, setShowRespHeaders] = useState(false);
  const startRef = useRef<number>(0);

  function addHeader() {
    setHeaders((h) => [...h, { key: "", value: "" }]);
  }

  function removeHeader(i: number) {
    setHeaders((h) => h.filter((_, idx) => idx !== i));
  }

  function updateHeader(i: number, field: "key" | "value", val: string) {
    setHeaders((h) => h.map((hdr, idx) => (idx === i ? { ...hdr, [field]: val } : hdr)));
  }

  async function send() {
    if (!url.trim() || url === "https://") return;
    setSending(true);
    setResponseStatus(null);
    setResponseBody(null);
    setResponseHeaders([]);
    startRef.current = Date.now();

    try {
      const hdrs: Record<string, string> = {};
      headers.filter((h) => h.key.trim()).forEach((h) => { hdrs[h.key] = h.value; });

      const init: RequestInit = { method, headers: hdrs };
      if (BODY_METHODS.includes(method) && body) init.body = body;

      const resp = await fetch(url, init);
      const elapsed = Date.now() - startRef.current;
      const text = await resp.text();
      const pretty = tryPrettyJson(text);

      setResponseStatus(resp.status);
      setResponseMs(elapsed);
      setResponseBody(pretty);
      const hList: [string, string][] = [];
      resp.headers.forEach((v, k) => hList.push([k, v]));
      setResponseHeaders(hList);

      setHistory((prev) => [
        {
          method,
          url,
          status: resp.status,
          ms: elapsed,
          time: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      const elapsed = Date.now() - startRef.current;
      setResponseStatus(0);
      setResponseMs(elapsed);
      setResponseBody(err instanceof Error ? err.message : "Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* URL bar */}
      <div className="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className={`bg-bg-base border border-border rounded px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-accent-red ${METHOD_COLORS[method]}`}
        >
          {(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"] as HttpMethod[]).map((m) => (
            <option key={m} value={m} className="text-text-primary">{m}</option>
          ))}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="https://example.com/api"
          className="flex-1 bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red font-mono"
        />
        <button
          onClick={send}
          disabled={sending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/40 rounded transition-colors disabled:opacity-50"
        >
          <Send size={12} />
          {sending ? "..." : "Send"}
        </button>
      </div>

      {/* Headers editor */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-muted font-medium">Headers</span>
          <button onClick={addHeader} className="text-text-muted hover:text-accent-red transition-colors">
            <Plus size={12} />
          </button>
        </div>
        <div className="space-y-1">
          {headers.map((h, i) => (
            <div key={i} className="flex gap-1">
              <input
                type="text"
                value={h.key}
                onChange={(e) => updateHeader(i, "key", e.target.value)}
                placeholder="Header"
                className="w-32 bg-bg-base border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red"
              />
              <input
                type="text"
                value={h.value}
                onChange={(e) => updateHeader(i, "value", e.target.value)}
                placeholder="Value"
                className="flex-1 bg-bg-base border border-border rounded px-2 py-1 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red"
              />
              <button onClick={() => removeHeader(i)} className="text-text-muted hover:text-accent-red px-1">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      {BODY_METHODS.includes(method) && (
        <div>
          <span className="block text-xs text-text-muted font-medium mb-1.5">Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder='{"key": "value"}'
            className="w-full bg-bg-base border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red font-mono resize-none"
          />
        </div>
      )}

      {/* Response */}
      {responseStatus !== null && (
        <div className="border border-border rounded overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-2 bg-elevated border-b border-border">
            <span className={`text-xs font-bold ${statusColor(responseStatus)}`}>
              {responseStatus === 0 ? "ERR" : responseStatus}
            </span>
            {responseMs !== null && (
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Clock size={10} /> {responseMs}ms
              </span>
            )}
            <button
              onClick={() => setShowRespHeaders((s) => !s)}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary ml-auto"
            >
              {showRespHeaders ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              Headers
            </button>
          </div>
          {showRespHeaders && (
            <div className="px-3 py-2 border-b border-border bg-bg-base max-h-28 overflow-y-auto">
              {responseHeaders.map(([k, v]) => (
                <div key={k} className="text-xs font-mono">
                  <span className="text-accent-green">{k}</span>
                  <span className="text-text-muted">: </span>
                  <span className="text-text-primary">{v}</span>
                </div>
              ))}
            </div>
          )}
          <pre className="p-3 text-xs font-mono text-text-primary max-h-48 overflow-auto bg-bg-base whitespace-pre-wrap break-all">
            {responseBody}
          </pre>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <span className="block text-xs text-text-muted font-medium mb-1.5">History</span>
          <div className="space-y-0.5">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setMethod(h.method); setUrl(h.url); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-elevated transition-colors text-left"
              >
                <span className={`font-semibold w-12 flex-shrink-0 ${METHOD_COLORS[h.method]}`}>
                  {h.method}
                </span>
                <span className={`w-10 flex-shrink-0 font-mono ${statusColor(h.status)}`}>
                  {h.status || "ERR"}
                </span>
                <span className="text-text-muted truncate flex-1">{h.url}</span>
                <span className="text-text-muted flex-shrink-0">{h.time}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
