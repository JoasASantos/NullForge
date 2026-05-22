; Windows x64 Bind TCP Shell - port 4444
; MASM-compatible syntax; use nasm or ml64

[BITS 64]
global _start

_start:
    ; WSAStartup via PEB walk (condensed)
    sub    rsp, 28h
    
    ; Standard x64 PEB walk
    xor    rax, rax
    mov    rax, [gs:rax+0x60]  ; PEB
    mov    rax, [rax+0x18]     ; PEB_LDR_DATA
    mov    rax, [rax+0x30]     ; InInitializationOrderModuleList
    mov    rax, [rax]          ; Flink (ntdll)
    mov    rax, [rax]          ; Flink (kernel32)
    mov    rax, [rax+0x10]     ; kernel32 base
    
    ; Resolve LoadLibraryA to load ws2_32.dll
    ; ... (hash-based export resolution omitted for brevity)
    ; See: msfvenom -p windows/x64/shell_bind_tcp for working version
    
    nop
    int3
