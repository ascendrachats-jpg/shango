// ─── Zero-Dependency Pure TypeScript ZIP Generator ─────────────────────────────

export interface ZipEntry {
  path: string
  content: string | Uint8Array
}

// Compute CRC-32 checksum for a Uint8Array
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c
}

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

const encoder = new TextEncoder()

/** Concatenate multiple Uint8Arrays into a single Uint8Array (avoids ArrayBufferLike issues) */
function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

/**
 * Creates a valid PKZIP binary Blob containing the specified entries.
 */
export function createZipBlob(entries: ZipEntry[]): Blob {
  const localHeaderParts: Uint8Array[] = []
  const centralDirParts: Uint8Array[] = []
  let currentOffset = 0

  for (const entry of entries) {
    // Always produce a plain Uint8Array backed by a fresh ArrayBuffer
    const pathBytes = new Uint8Array(
      encoder.encode(entry.path.replace(/\\/g, "/")),
    )
    const srcData =
      typeof entry.content === "string"
        ? encoder.encode(entry.content)
        : entry.content
    const dataBytes = new Uint8Array(srcData) // copy ensures ArrayBuffer backing

    const checksum = crc32(dataBytes)
    const uncompressedSize = dataBytes.length
    const compressedSize = uncompressedSize // Store method (no compression)

    // DOS Time / Date (fixed constants for deterministic builds)
    const dosTime = 0x4800 // 09:00:00
    const dosDate = 0x589f // 2024-04-31

    // ── Local File Header (30 bytes + path + data) ──
    const localHeader = new Uint8Array(30 + pathBytes.length)
    const localView = new DataView(localHeader.buffer)

    localView.setUint32(0, 0x04034b50, true) // Local file header signature
    localView.setUint16(4, 20, true) // Version needed to extract (2.0)
    localView.setUint16(6, 0x0800, true) // General purpose bit flag (UTF-8)
    localView.setUint16(8, 0, true) // Compression method (0 = store)
    localView.setUint16(10, dosTime, true) // File last modification time
    localView.setUint16(12, dosDate, true) // File last modification date
    localView.setUint32(14, checksum, true) // CRC-32
    localView.setUint32(18, compressedSize, true)
    localView.setUint32(22, uncompressedSize, true)
    localView.setUint16(26, pathBytes.length, true) // File name length
    localView.setUint16(28, 0, true) // Extra field length

    localHeader.set(pathBytes, 30)
    localHeaderParts.push(localHeader, dataBytes)

    // ── Central Directory File Header (46 bytes + path) ──
    const centralHeader = new Uint8Array(46 + pathBytes.length)
    const centralView = new DataView(centralHeader.buffer)

    centralView.setUint32(0, 0x02014b50, true) // Central directory header signature
    centralView.setUint16(4, 20, true) // Version made by
    centralView.setUint16(6, 20, true) // Version needed to extract
    centralView.setUint16(8, 0x0800, true) // General purpose bit flag (UTF-8)
    centralView.setUint16(10, 0, true) // Compression method
    centralView.setUint16(12, dosTime, true) // File last modification time
    centralView.setUint16(14, dosDate, true) // File last modification date
    centralView.setUint32(16, checksum, true) // CRC-32
    centralView.setUint32(20, compressedSize, true)
    centralView.setUint32(24, uncompressedSize, true)
    centralView.setUint16(28, pathBytes.length, true)
    centralView.setUint16(30, 0, true) // Extra field length
    centralView.setUint16(32, 0, true) // File comment length
    centralView.setUint16(34, 0, true) // Disk number start
    centralView.setUint16(36, 0, true) // Internal file attributes
    centralView.setUint32(38, 0, true) // External file attributes
    centralView.setUint32(42, currentOffset, true) // Relative offset of local header

    centralHeader.set(pathBytes, 46)
    centralDirParts.push(centralHeader)

    currentOffset += localHeader.length + dataBytes.length
  }

  const centralDirStartOffset = currentOffset
  let centralDirSize = 0
  for (const part of centralDirParts) {
    centralDirSize += part.length
  }

  // ── End of Central Directory Record (22 bytes) ──
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)

  eocdView.setUint32(0, 0x06054b50, true) // End of central dir signature
  eocdView.setUint16(4, 0, true) // Number of this disk
  eocdView.setUint16(6, 0, true) // Disk where central directory starts
  eocdView.setUint16(8, entries.length, true) // Number of central directory records on this disk
  eocdView.setUint16(10, entries.length, true) // Total number of central directory records
  eocdView.setUint32(12, centralDirSize, true) // Size of central directory
  eocdView.setUint32(16, centralDirStartOffset, true) // Offset of start of central directory
  eocdView.setUint16(20, 0, true) // ZIP file comment length

  // Pass the backing ArrayBuffer directly — guaranteed plain ArrayBuffer since concat() uses `new Uint8Array(total)`
  const combined = concat([...localHeaderParts, ...centralDirParts, eocd])
  return new Blob([combined.buffer as ArrayBuffer], { type: "application/zip" })
}
