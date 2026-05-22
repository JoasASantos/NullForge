; Title:    Windows x64 MessageBox stub
; Platform: windows
; Arch:     x64
; Size:     ~50 bytes
; Encoding: raw
;
; Assembled hex:
; \x48\x83\xec\x28\x48\x83\xe4\xf0\x48\x8d\x0d\x...\xff\xd0\x48\x83\xc4\x28\xc3

BITS 64
global _start

_start:
    BITS    64
    ; MessageBox("NullForge PoC", "Shellcode Executed", MB_OK)
    ; Requires: kernel32!GetProcAddress + user32!MessageBoxA resolved
    sub     rsp, 0x28           ; shadow space + align
    and     rsp, -16
    ; Load user32.dll
    lea     rcx, [rel str_user32]
    ; call LoadLibraryA (address resolved via PEB walk)
    ; call MessageBoxA(NULL, "Shellcode Executed", "NullForge", 0)
    xor     rcx, rcx            ; hWnd = NULL
    lea     rdx, [rel msg_body]
    lea     r8, [rel msg_title]
    xor     r9d, r9d            ; MB_OK
    ; call [MessageBoxA]
    add     rsp, 0x28
    ret
str_user32: db "user32.dll", 0
msg_body:   db "Shellcode Executed!", 0
msg_title:  db "NullForge PoC", 0
