import { computeChecksum } from "@/lib/checksum"
import { parseDdmm, parseUtcDate, parseUtcTime } from "@/lib/coords"
import type {
  FixMode,
  FixQuality,
  GgaData,
  GllData,
  GsaData,
  GstData,
  GsvData,
  PairAckCode,
  ParsedSentence,
  RmcData,
  SatelliteInfo,
  VtgData,
  ZdaData,
} from "./types"

const PAIR_RE = /^PAIR(\d{3,})$/

export function parseSentence(rawInput: string): ParsedSentence {
  const raw = rawInput.trim()
  if (raw.length === 0) {
    return { kind: "unknown", raw, reason: "empty" }
  }
  if (!raw.startsWith("$")) {
    return { kind: "unknown", raw, reason: "no-dollar" }
  }
  const star = raw.lastIndexOf("*")
  if (star < 0 || star + 3 > raw.length) {
    return { kind: "unknown", raw, reason: "no-checksum" }
  }
  const body = raw.slice(1, star)
  const expected = raw.slice(star + 1, star + 3).toUpperCase()
  if (computeChecksum(body) !== expected) {
    return { kind: "unknown", raw, reason: "checksum-mismatch" }
  }
  const fields = body.split(",")
  const head = fields[0] ?? ""

  if (head === "PAIR001") {
    const cid = fields[1] ?? ""
    const resultStr = fields[2] ?? ""
    const result = Number(resultStr)
    if (!Number.isFinite(result) || result < 0 || result > 5) {
      return { kind: "unknown", raw, reason: "checksum-mismatch" }
    }
    return { kind: "pair-ack", cid, result: result as PairAckCode, raw }
  }
  const pairMatch = PAIR_RE.exec(head)
  if (pairMatch) {
    return { kind: "pair", cid: pairMatch[1] ?? "", fields: fields.slice(1), raw }
  }
  if (head.length >= 5) {
    const talker = head.slice(0, 2)
    const type = head.slice(2)
    return { kind: "nmea", talker, type, fields: fields.slice(1), raw }
  }
  return { kind: "unknown", raw, reason: "no-checksum" }
}

function num(value: string | undefined): number | null {
  if (value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function fixQuality(value: string | undefined): FixQuality | null {
  const n = num(value)
  if (n === null) return null
  if (n === 0 || n === 1 || n === 2 || n === 4 || n === 5) return n
  return null
}

function fixMode(value: string | undefined): FixMode | null {
  if (value === "1" || value === "2" || value === "3") return value
  return null
}

export function decodeGGA(fields: string[]): GgaData {
  return {
    utc: parseUtcTime(fields[0] ?? ""),
    lat: parseDdmm(fields[1] ?? "", fields[2] ?? ""),
    lon: parseDdmm(fields[3] ?? "", fields[4] ?? ""),
    fixQuality: fixQuality(fields[5]),
    satsUsed: num(fields[6]),
    hdop: num(fields[7]),
    altitude: num(fields[8]),
    geoidSep: num(fields[10]),
  }
}

export function decodeRMC(fields: string[]): RmcData {
  const status = fields[1] === "A" || fields[1] === "V" ? (fields[1] as "A" | "V") : null
  return {
    utc: parseUtcTime(fields[0] ?? ""),
    status,
    lat: parseDdmm(fields[2] ?? "", fields[3] ?? ""),
    lon: parseDdmm(fields[4] ?? "", fields[5] ?? ""),
    speedKnots: num(fields[6]),
    courseTrue: num(fields[7]),
    date: parseUtcDate(fields[8] ?? ""),
    modeIndicator: fields[11] ?? null,
  }
}

export function decodeVTG(fields: string[]): VtgData {
  return {
    courseTrue: num(fields[0]),
    courseMag: num(fields[2]),
    speedKnots: num(fields[4]),
    speedKmh: num(fields[6]),
    modeIndicator: fields[8] ?? null,
  }
}

export function decodeGSA(fields: string[]): GsaData {
  const mode1 = fields[0] === "M" || fields[0] === "A" ? (fields[0] as "M" | "A") : null
  const fixModeRaw = fixMode(fields[1])
  const fixType = fixModeRaw === null ? null : (Number(fixModeRaw) as 1 | 2 | 3)
  const satsUsed = fields.slice(2, 14).filter((s) => s.length > 0)
  return {
    mode1,
    fixType,
    satsUsed,
    pdop: num(fields[14]),
    hdop: num(fields[15]),
    vdop: num(fields[16]),
    systemId: num(fields[17]),
  }
}

export function decodeGSV(fields: string[]): GsvData {
  const totalMessages = num(fields[0]) ?? 0
  const messageNumber = num(fields[1]) ?? 0
  const satsInView = num(fields[2]) ?? 0
  const satellites: SatelliteInfo[] = []
  // Each satellite occupies 4 fields (PRN, elevation, azimuth, SNR), starting at index 3.
  // The final field is the optional signal ID (NMEA v4.1+).
  let i = 3
  while (i + 3 < fields.length) {
    const prn = fields[i] ?? ""
    if (prn === "" && fields[i + 1] === "" && fields[i + 2] === "" && fields[i + 3] === "") {
      i += 4
      continue
    }
    if (prn === "") break
    satellites.push({
      prn,
      elevation: num(fields[i + 1]),
      azimuth: num(fields[i + 2]),
      snr: num(fields[i + 3]),
    })
    i += 4
  }
  const signalId = i < fields.length ? (fields[i] ?? null) : null
  return { totalMessages, messageNumber, satsInView, satellites, signalId }
}

export function decodeGLL(fields: string[]): GllData {
  const status = fields[5] === "A" || fields[5] === "V" ? (fields[5] as "A" | "V") : null
  return {
    lat: parseDdmm(fields[0] ?? "", fields[1] ?? ""),
    lon: parseDdmm(fields[2] ?? "", fields[3] ?? ""),
    utc: parseUtcTime(fields[4] ?? ""),
    status,
    modeIndicator: fields[6] ?? null,
  }
}

export function decodeGST(fields: string[]): GstData {
  return {
    utc: parseUtcTime(fields[0] ?? ""),
    rangeRms: num(fields[1]),
    stdMajor: num(fields[2]),
    stdMinor: num(fields[3]),
    orient: num(fields[4]),
    stdLat: num(fields[5]),
    stdLon: num(fields[6]),
    stdAlt: num(fields[7]),
  }
}

export function decodeZDA(fields: string[]): ZdaData {
  return {
    utc: parseUtcTime(fields[0] ?? ""),
    day: num(fields[1]),
    month: num(fields[2]),
    year: num(fields[3]),
  }
}
