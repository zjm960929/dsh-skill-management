/**
 * dsh-skill-management - dependency-free tar.gz archive support.
 *
 * Exported skill bundles use a small USTAR + gzip container so a package can be
 * shared as one `.tgz` file. The reader accepts the same USTAR subset and
 * rejects absolute paths, parent traversal and oversized expansions.
 */
import { gunzipSync, gzipSync } from "node:zlib";

export const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024;
export const MAX_ARCHIVE_UNPACKED_BYTES = 64 * 1024 * 1024;
export const MAX_ARCHIVE_FILES = 2000;

const BLOCK_SIZE = 512;
const ZERO_BLOCK = Buffer.alloc(BLOCK_SIZE);

/** Archive failure with a stable machine code. */
export class ArchiveError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ArchiveError";
    this.code = code;
  }
}

function normalizeArchivePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ArchiveError("invalid-archive", "archive entry path is empty.");
  }
  const path = value.replaceAll("\\", "/");
  if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) {
    throw new ArchiveError("invalid-archive", `archive entry path is absolute: ${value}`);
  }
  const parts = path.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.length === 0 || parts.some((part) => part === "..")) {
    throw new ArchiveError("invalid-archive", `archive entry path escapes its root: ${value}`);
  }
  return parts.join("/");
}

function splitUstarName(path) {
  const bytes = Buffer.byteLength(path, "utf8");
  if (bytes <= 100) return { name: path, prefix: "" };
  for (let index = path.lastIndexOf("/"); index > 0; index = path.lastIndexOf("/", index - 1)) {
    const prefix = path.slice(0, index);
    const name = path.slice(index + 1);
    if (Buffer.byteLength(name, "utf8") <= 100 && Buffer.byteLength(prefix, "utf8") <= 155) {
      return { name, prefix };
    }
  }
  throw new ArchiveError("archive-path-too-long", `archive entry path is too long: ${path}`);
}

function putString(header, value, offset, length) {
  const data = Buffer.from(value, "utf8");
  if (data.length > length) {
    throw new ArchiveError("archive-path-too-long", `archive header field exceeds ${length} bytes.`);
  }
  data.copy(header, offset, 0, Math.min(data.length, length));
}

function putOctal(header, value, offset, length) {
  const text = value.toString(8);
  if (text.length > length - 1) {
    throw new ArchiveError("archive-value-too-large", `tar value ${value} does not fit ${length} bytes.`);
  }
  putString(header, `${text.padStart(length - 1, "0")}\0`, offset, length);
}

function createTarHeader(entry) {
  const path = normalizeArchivePath(entry.path);
  const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data ?? ""), "utf8");
  const split = splitUstarName(path);
  const header = Buffer.alloc(BLOCK_SIZE, 0);
  putString(header, split.name, 0, 100);
  putOctal(header, entry.mode ?? 0o644, 100, 8);
  putOctal(header, 0, 108, 8);
  putOctal(header, 0, 116, 8);
  putOctal(header, data.length, 124, 12);
  putOctal(header, Math.max(0, Math.floor((entry.mtime ?? Date.now()) / 1000)), 136, 12);
  header.fill(0x20, 148, 156);
  header[156] = 0x30;
  putString(header, "ustar\0", 257, 6);
  putString(header, "00", 263, 2);
  putString(header, "dsh", 265, 32);
  putString(header, "dsh", 297, 32);
  putString(header, split.prefix, 345, 155);
  let checksum = 0;
  for (const byte of header) checksum += byte;
  putString(header, `${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8);
  return { header, data };
}

/** Create a gzip-compressed USTAR archive from `{ path, data }` entries. */
export function createTarGz(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new ArchiveError("invalid-archive", "an archive needs at least one entry.");
  }
  if (entries.length > MAX_ARCHIVE_FILES) {
    throw new ArchiveError("too-many-files", `archive has more than ${MAX_ARCHIVE_FILES} entries.`);
  }
  const parts = [];
  let unpacked = 0;
  for (const entry of entries) {
    const { header, data } = createTarHeader(entry);
    unpacked += data.length;
    if (unpacked > MAX_ARCHIVE_UNPACKED_BYTES) {
      throw new ArchiveError("archive-too-large", "archive content exceeds the unpacked size limit.");
    }
    parts.push(header, data);
    const padding = (BLOCK_SIZE - (data.length % BLOCK_SIZE)) % BLOCK_SIZE;
    if (padding > 0) parts.push(Buffer.alloc(padding, 0));
  }
  parts.push(ZERO_BLOCK, ZERO_BLOCK);
  const tar = Buffer.concat(parts);
  const gzip = gzipSync(tar, { level: 9 });
  if (gzip.length > MAX_ARCHIVE_BYTES) {
    throw new ArchiveError("archive-too-large", `archive exceeds ${MAX_ARCHIVE_BYTES} bytes.`);
  }
  return gzip;
}

function readString(header, offset, length) {
  let end = offset + length;
  while (end > offset && header[end - 1] === 0) end -= 1;
  return header.subarray(offset, end).toString("utf8");
}

function parseTar(tar) {
  const entries = [];
  let offset = 0;
  let zeroBlocks = 0;
  let unpacked = 0;
  while (offset + BLOCK_SIZE <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK_SIZE);
    if (header.equals(ZERO_BLOCK)) {
      zeroBlocks += 1;
      offset += BLOCK_SIZE;
      if (zeroBlocks >= 2) break;
      continue;
    }
    zeroBlocks = 0;
    const expectedChecksum = Number.parseInt(readString(header, 148, 8).trim() || "0", 8);
    if (Number.isFinite(expectedChecksum) && expectedChecksum > 0) {
      let checksum = 0;
      for (let index = 0; index < BLOCK_SIZE; index += 1) {
        checksum += index >= 148 && index < 156 ? 0x20 : header[index];
      }
      if (checksum !== expectedChecksum) {
        throw new ArchiveError("invalid-archive", "tar header checksum does not match.");
      }
    }
    const name = readString(header, 0, 100);
    const prefix = readString(header, 345, 155);
    const path = normalizeArchivePath(prefix === "" ? name : `${prefix}/${name}`);
    const size = Number.parseInt(readString(header, 124, 12).trim() || "0", 8);
    if (!Number.isFinite(size) || size < 0) {
      throw new ArchiveError("invalid-archive", `tar entry has an invalid size: ${path}`);
    }
    const dataStart = offset + BLOCK_SIZE;
    const dataEnd = dataStart + size;
    if (dataEnd > tar.length) {
      throw new ArchiveError("invalid-archive", `tar entry is truncated: ${path}`);
    }
    unpacked += size;
    if (unpacked > MAX_ARCHIVE_UNPACKED_BYTES) {
      throw new ArchiveError("archive-too-large", "archive content exceeds the unpacked size limit.");
    }
    const type = String.fromCharCode(header[156] || 0x30);
    if (type === "0" || type === "\0") {
      entries.push({ path, data: Buffer.from(tar.subarray(dataStart, dataEnd)) });
      if (entries.length > MAX_ARCHIVE_FILES) {
        throw new ArchiveError("too-many-files", `archive has more than ${MAX_ARCHIVE_FILES} files.`);
      }
    }
    offset = dataStart + Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
  }
  if (entries.length === 0) {
    throw new ArchiveError("archive-empty", "archive contains no regular files.");
  }
  return entries;
}

/** Read a gzip-compressed USTAR archive into `{ path, data }` entries. */
export function readTarGz(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ArchiveError("invalid-archive", "archive content is empty.");
  }
  if (buffer.length > MAX_ARCHIVE_BYTES) {
    throw new ArchiveError("archive-too-large", `archive exceeds ${MAX_ARCHIVE_BYTES} bytes.`);
  }
  if (buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
    throw new ArchiveError("unsupported-archive", "only gzip-compressed .tgz archives are supported.");
  }
  let tar;
  try {
    tar = gunzipSync(buffer, { maxOutputLength: MAX_ARCHIVE_UNPACKED_BYTES });
  } catch (error) {
    if (error?.code === "ERR_BUFFER_TOO_LARGE" || error?.code === "ERR_OUT_OF_RANGE") {
      throw new ArchiveError("archive-too-large", "archive expands beyond the unpacked size limit.");
    }
    throw new ArchiveError("invalid-archive", "archive is not a valid gzip stream.");
  }
  return parseTar(tar);
}
