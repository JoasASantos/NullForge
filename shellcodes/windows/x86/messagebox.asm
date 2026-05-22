; Title:    Windows x86 MessageBox "NullForge PoC"
; Platform: windows
; Arch:     x86
; Size:     ~78 bytes
; Encoding: raw
;
; Hex: \x31\xdb\x64\x8b\x5b\x30\x8b\x5b\x0c\x8b\x5b\x14\x8b\x1b\x8b\x1b\x8b\x43\x18\x89\x44\x24\xfc...

BITS 32
global _start

_start:
    ; PEB walk to find kernel32 base
    xor     ebx, ebx
    mov     ebx, [fs:ebx+0x30]  ; PEB
    mov     ebx, [ebx+0x0c]     ; LDR
    mov     ebx, [ebx+0x14]     ; InMemoryOrderModuleList.Flink
    mov     ebx, [ebx]          ; skip ntdll
    mov     eax, [ebx+0x10]     ; kernel32 base in eax
    ; ... resolve GetProcAddress, LoadLibraryA, MessageBoxA
    ; MessageBox(NULL, "Shellcode!", "NullForge", MB_OK)
    push    0
    push    0x65676f72          ; "roge"
    push    0x666c6c75          ; "ullf"
    push    0x4e        ; "N"
    mov     ecx, esp            ; title
    push    0
    push    0x21213231          ; "12!!"
    push    0x65646f63          ; "code"
    push    0x6c6c6548          ; "Hell"
    mov     edx, esp            ; msg
    xor     eax, eax
    push    eax
    push    ecx
    push    edx
    push    eax
    ; call MessageBoxA (address must be resolved)
    ret                         ; return to resolved address
