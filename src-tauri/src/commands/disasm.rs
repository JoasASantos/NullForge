use capstone::prelude::*;
use object::{Object, ObjectSection, ObjectSymbol, SymbolKind};
use serde::{Deserialize, Serialize};

// ─── Data types ──────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct DisasmInstruction {
    pub addr: u64,
    pub hex: String,
    pub mnemonic: String,
    pub op_str: String,
    pub is_call: bool,
    pub is_jump: bool,
    pub is_ret: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BinaryFunction {
    pub addr: u64,
    pub name: String,
    pub size: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BinaryString {
    pub addr: u64,
    pub value: String,
    pub section: String,
}

#[derive(Serialize, Deserialize)]
pub struct SectionInfo {
    pub name: String,
    pub addr: u64,
    pub size: u64,
    pub flags: String,
}

#[derive(Serialize, Deserialize)]
pub struct BinaryInfo {
    pub path: String,
    pub arch: String,
    pub format: String,
    pub entry_point: u64,
    pub functions: Vec<BinaryFunction>,
    pub sections: Vec<SectionInfo>,
    pub strings: Vec<BinaryString>,
    pub is_64bit: bool,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn build_capstone(arch: &str) -> Result<Capstone, String> {
    match arch {
        "x86_64" => Capstone::new()
            .x86()
            .mode(arch::x86::ArchMode::Mode64)
            .detail(true)
            .build()
            .map_err(|e| e.to_string()),
        "x86" => Capstone::new()
            .x86()
            .mode(arch::x86::ArchMode::Mode32)
            .detail(true)
            .build()
            .map_err(|e| e.to_string()),
        "aarch64" => Capstone::new()
            .arm64()
            .mode(arch::arm64::ArchMode::Arm)
            .detail(true)
            .build()
            .map_err(|e| e.to_string()),
        "arm" => Capstone::new()
            .arm()
            .mode(arch::arm::ArchMode::Arm)
            .detail(true)
            .build()
            .map_err(|e| e.to_string()),
        _ => Capstone::new()
            .x86()
            .mode(arch::x86::ArchMode::Mode64)
            .detail(true)
            .build()
            .map_err(|e| e.to_string()),
    }
}

fn mnemonic_flags(mnemonic: &str) -> (bool, bool, bool) {
    let m = mnemonic.to_ascii_lowercase();
    let is_call = m.starts_with("call") || m.starts_with("bl") && !m.starts_with("bls");
    let is_ret = m == "ret" || m == "retn" || m == "retf" || m == "retq" || m == "bx" || m == "ret.n";
    let is_jump = !is_call
        && !is_ret
        && (m.starts_with('j')
            || m.starts_with("b.") // ARM conditional branch
            || m == "b"
            || m == "bl"
            || m == "cbz"
            || m == "cbnz"
            || m == "tbz"
            || m == "tbnz");
    (is_call, is_jump, is_ret)
}

fn insns_to_vec(cs: &Capstone, insns: capstone::Instructions) -> Vec<DisasmInstruction> {
    insns
        .iter()
        .map(|i| {
            let mnemonic = i.mnemonic().unwrap_or("").to_string();
            let op_str = i.op_str().unwrap_or("").to_string();
            let hex = i
                .bytes()
                .iter()
                .map(|b| format!("{:02x}", b))
                .collect::<Vec<_>>()
                .join(" ");
            let (is_call, is_jump, is_ret) = mnemonic_flags(&mnemonic);
            DisasmInstruction {
                addr: i.address(),
                hex,
                mnemonic,
                op_str,
                is_call,
                is_jump,
                is_ret,
            }
        })
        .collect()
}

/// Find the raw bytes that correspond to [addr, addr+size) by scanning sections.
fn bytes_for_range<'d>(
    obj: &object::File<'d>,
    addr: u64,
    size: usize,
) -> Option<Vec<u8>> {
    for section in obj.sections() {
        let sec_addr = section.address();
        let sec_data = match section.data() {
            Ok(d) => d,
            Err(_) => continue,
        };
        let sec_end = sec_addr + sec_data.len() as u64;
        if addr >= sec_addr && addr < sec_end {
            let offset = (addr - sec_addr) as usize;
            let avail = sec_data.len() - offset;
            let take = avail.min(size);
            return Some(sec_data[offset..offset + take].to_vec());
        }
    }
    None
}

fn extract_strings_from_section(
    data: &[u8],
    base_addr: u64,
    section_name: &str,
) -> Vec<BinaryString> {
    let mut result = Vec::new();
    let mut run_start: Option<usize> = None;
    for (i, &b) in data.iter().enumerate() {
        let printable = b >= 0x20 && b < 0x7f;
        match (printable, run_start) {
            (true, None) => run_start = Some(i),
            (false, Some(start)) => {
                let len = i - start;
                if len >= 4 {
                    if let Ok(s) = std::str::from_utf8(&data[start..i]) {
                        result.push(BinaryString {
                            addr: base_addr + start as u64,
                            value: s.to_string(),
                            section: section_name.to_string(),
                        });
                    }
                }
                run_start = None;
            }
            _ => {}
        }
    }
    // flush trailing run
    if let Some(start) = run_start {
        let len = data.len() - start;
        if len >= 4 {
            if let Ok(s) = std::str::from_utf8(&data[start..]) {
                result.push(BinaryString {
                    addr: base_addr + start as u64,
                    value: s.to_string(),
                    section: section_name.to_string(),
                });
            }
        }
    }
    result
}

// ─── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn disasm_load_binary(path: String) -> Result<BinaryInfo, String> {
    let data = std::fs::read(&path).map_err(|e| format!("Failed to read file: {e}"))?;

    let obj = object::File::parse(data.as_slice()).map_err(|e| format!("Failed to parse binary: {e}"))?;

    // Arch
    let arch = match obj.architecture() {
        object::Architecture::X86_64 => "x86_64",
        object::Architecture::I386 => "x86",
        object::Architecture::Aarch64 => "aarch64",
        object::Architecture::Arm => "arm",
        object::Architecture::Mips => "mips",
        object::Architecture::Mips64 => "mips64",
        object::Architecture::PowerPc => "ppc",
        object::Architecture::PowerPc64 => "ppc64",
        object::Architecture::Riscv32 => "riscv32",
        object::Architecture::Riscv64 => "riscv64",
        _ => "unknown",
    }
    .to_string();

    // Format
    let format = match obj.format() {
        object::BinaryFormat::Elf => "ELF",
        object::BinaryFormat::MachO => "Mach-O",
        object::BinaryFormat::Pe => "PE",
        object::BinaryFormat::Wasm => "WASM",
        object::BinaryFormat::Xcoff => "XCOFF",
        _ => "raw",
    }
    .to_string();

    let is_64bit = obj.is_64();
    let entry_point = obj.entry();

    // Sections
    let sections: Vec<SectionInfo> = obj
        .sections()
        .map(|s| {
            let flags = format!("{:?}", s.kind());
            SectionInfo {
                name: s.name().unwrap_or("<?>").to_string(),
                addr: s.address(),
                size: s.size(),
                flags,
            }
        })
        .collect();

    // Build a set of valid code section address ranges for filtering
    let code_ranges: Vec<(u64, u64)> = obj
        .sections()
        .filter(|s| matches!(s.kind(), object::SectionKind::Text))
        .filter_map(|s| {
            let start = s.address();
            let len = s.data().ok()?.len() as u64;
            if len > 0 { Some((start, start + len)) } else { None }
        })
        .collect();

    // Functions from symbols — only keep those that fall inside a code section
    let mut functions: Vec<BinaryFunction> = obj
        .symbols()
        .filter(|sym| sym.kind() == SymbolKind::Text && sym.address() != 0)
        .filter(|sym| {
            let addr = sym.address();
            code_ranges.iter().any(|(start, end)| addr >= *start && addr < *end)
        })
        .map(|sym| BinaryFunction {
            addr: sym.address(),
            name: sym.name().unwrap_or("<unnamed>").to_string(),
            size: sym.size(),
        })
        .collect();

    // Deduplicate by address, sort by address
    functions.sort_by_key(|f| f.addr);
    functions.dedup_by_key(|f| f.addr);

    // If no symbols, synthesise entry point from the start of the first code section
    // (obj.entry() on Mach-O returns a file offset, not a virtual address — unreliable)
    if functions.is_empty() {
        if let Some((start, _)) = code_ranges.first() {
            functions.push(BinaryFunction {
                addr: *start,
                name: "_start".to_string(),
                size: 0,
            });
        }
    }

    // Strings from .rodata / .data sections
    let string_sections = [".rodata", ".data", "__cstring", "__data", "__const"];
    let mut strings: Vec<BinaryString> = Vec::new();
    for section in obj.sections() {
        let name = section.name().unwrap_or("");
        if string_sections.contains(&name) {
            if let Ok(sec_data) = section.data() {
                let mut found = extract_strings_from_section(sec_data, section.address(), name);
                strings.append(&mut found);
            }
        }
    }

    Ok(BinaryInfo {
        path,
        arch,
        format,
        entry_point,
        functions,
        sections,
        strings,
        is_64bit,
    })
}

#[tauri::command]
pub async fn disasm_range(
    path: String,
    addr: u64,
    size: usize,
    arch: String,
) -> Result<Vec<DisasmInstruction>, String> {
    let data = std::fs::read(&path).map_err(|e| format!("Failed to read file: {e}"))?;
    let obj = object::File::parse(data.as_slice()).map_err(|e| format!("Failed to parse binary: {e}"))?;

    let bytes = bytes_for_range(&obj, addr, size)
        .ok_or_else(|| format!("Address 0x{addr:x} not found in any section"))?;

    let cs = build_capstone(&arch)?;
    let insns = cs
        .disasm_all(&bytes, addr)
        .map_err(|e| e.to_string())?;

    Ok(insns_to_vec(&cs, insns))
}

#[tauri::command]
pub async fn disasm_function(
    path: String,
    func_addr: u64,
    func_size: u64,
    arch: String,
) -> Result<Vec<DisasmInstruction>, String> {
    let size = if func_size == 0 { 4096 } else { func_size as usize };
    disasm_range(path, func_addr, size, arch).await
}

// ─── ROP Gadget types ────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct RopGadget {
    pub addr: u64,
    pub instructions: Vec<String>,
    pub bytes: String,
    pub size: usize,
}

#[tauri::command]
pub async fn disasm_find_gadgets(
    path: String,
    arch: String,
    max_insns: Option<usize>,
) -> Result<Vec<RopGadget>, String> {
    let max = max_insns.unwrap_or(6);
    let data = std::fs::read(&path).map_err(|e| format!("Failed to read: {e}"))?;
    let obj = object::File::parse(data.as_slice())
        .map_err(|e| format!("Failed to parse: {e}"))?;
    let cs = build_capstone(&arch)?;

    let mut gadgets: Vec<RopGadget> = Vec::new();
    let mut seen = std::collections::HashSet::<u64>::new();
    const MAX_GADGETS: usize = 5000;

    for section in obj.sections() {
        if !matches!(section.kind(), object::SectionKind::Text) {
            continue;
        }
        let sec_data = match section.data() {
            Ok(d) => d,
            Err(_) => continue,
        };
        let base_addr = section.address();

        // Collect positions of ret-like instructions per arch
        let ret_positions: Vec<(usize, usize)> = match arch.as_str() {
            "x86_64" | "x86" => sec_data
                .iter()
                .enumerate()
                .filter_map(|(i, &b)| {
                    if b == 0xC3 { Some((i, 1)) }       // ret
                    else if b == 0xCB { Some((i, 1)) }   // retf
                    else { None }
                })
                .collect(),
            "aarch64" => sec_data
                .windows(4)
                .enumerate()
                .filter_map(|(i, w)| {
                    if i % 4 == 0 && w == [0xC0, 0x03, 0x5F, 0xD6] {
                        Some((i + 3, 4)) // point to last byte, size=4
                    } else {
                        None
                    }
                })
                .collect(),
            _ => continue,
        };

        'outer: for (ret_pos, ret_insn_size) in ret_positions {
            if gadgets.len() >= MAX_GADGETS {
                break;
            }
            let end = ret_pos + ret_insn_size;
            let max_back = (max * 15).min(ret_pos);

            for back in 1..=max_back {
                if gadgets.len() >= MAX_GADGETS {
                    break 'outer;
                }
                let start = ret_pos - back;
                let candidate = &sec_data[start..end];
                let start_addr = base_addr + start as u64;

                let raw_insns = match cs.disasm_all(candidate, start_addr) {
                    Ok(i) => i,
                    Err(_) => continue,
                };
                let insns: Vec<_> = raw_insns.iter().collect();

                if insns.len() < 2 || insns.len() > max {
                    continue;
                }

                // Last decoded instruction must reach the end of our candidate
                let last = &insns[insns.len() - 1];
                let last_end = last.address() + last.bytes().len() as u64;
                if last_end != base_addr + end as u64 {
                    continue;
                }

                // Last must be ret/retf/bx lr
                let last_mn = last.mnemonic().unwrap_or("").to_lowercase();
                let is_ret_insn = last_mn.starts_with("ret") || last_mn == "bx";
                if !is_ret_insn {
                    continue;
                }

                // No intermediate rets/calls/int3 in the chain
                let has_bad = insns[..insns.len() - 1].iter().any(|i| {
                    let m = i.mnemonic().unwrap_or("").to_lowercase();
                    m.starts_with("ret") || m.starts_with("call") || m == "int3" || m == "int"
                });
                if has_bad {
                    continue;
                }

                let addr = insns[0].address();
                if !seen.insert(addr) {
                    continue;
                }

                let instructions: Vec<String> = insns
                    .iter()
                    .map(|i| {
                        let op = i.op_str().unwrap_or("").trim();
                        if op.is_empty() {
                            i.mnemonic().unwrap_or("").to_string()
                        } else {
                            format!("{} {}", i.mnemonic().unwrap_or(""), op)
                        }
                    })
                    .collect();

                let bytes_hex = candidate
                    .iter()
                    .map(|b| format!("{:02x}", b))
                    .collect::<Vec<_>>()
                    .join(" ");

                gadgets.push(RopGadget {
                    addr,
                    instructions,
                    bytes: bytes_hex,
                    size: candidate.len(),
                });
            }
        }
    }

    gadgets.sort_by_key(|g| g.addr);
    Ok(gadgets)
}

#[tauri::command]
pub async fn disasm_shellcode(
    hex_bytes: String,
    arch: String,
) -> Result<Vec<DisasmInstruction>, String> {
    // Support both "48 31 c0" and "\x48\x31\xc0" formats
    let raw_bytes: Vec<u8> = if hex_bytes.contains("\\x") || hex_bytes.contains("\\X") {
        // \xNN escape format
        let mut bytes = Vec::new();
        let s = hex_bytes.replace("\\x", " ").replace("\\X", " ");
        for tok in s.split_whitespace() {
            let tok = tok.trim_start_matches("0x").trim_start_matches("0X");
            if tok.is_empty() {
                continue;
            }
            let b = u8::from_str_radix(tok, 16)
                .map_err(|_| format!("Invalid hex token: {tok}"))?;
            bytes.push(b);
        }
        bytes
    } else {
        // Space/comma-separated hex: "48 31 c0" or "48,31,c0"
        let s = hex_bytes.replace(',', " ");
        let mut bytes = Vec::new();
        for tok in s.split_whitespace() {
            let tok = tok.trim_start_matches("0x").trim_start_matches("0X");
            if tok.is_empty() {
                continue;
            }
            let b = u8::from_str_radix(tok, 16)
                .map_err(|_| format!("Invalid hex token: {tok}"))?;
            bytes.push(b);
        }
        bytes
    };

    if raw_bytes.is_empty() {
        return Err("No bytes to disassemble".to_string());
    }

    let cs = build_capstone(&arch)?;
    let insns = cs
        .disasm_all(&raw_bytes, 0)
        .map_err(|e| e.to_string())?;

    Ok(insns_to_vec(&cs, insns))
}
