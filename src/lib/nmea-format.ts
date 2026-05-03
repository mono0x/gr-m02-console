export function formatLat(lat: number | null): string {
  if (lat === null) return "—"
  const dir = lat >= 0 ? "N" : "S"
  return `${Math.abs(lat).toFixed(6)}° ${dir}`
}

export function formatLon(lon: number | null): string {
  if (lon === null) return "—"
  const dir = lon >= 0 ? "E" : "W"
  return `${Math.abs(lon).toFixed(6)}° ${dir}`
}

export function formatNumber(n: number | null, fractionDigits = 2, unit = ""): string {
  if (n === null) return "—"
  const value = n.toFixed(fractionDigits)
  return unit ? `${value} ${unit}` : value
}

export const FIX_QUALITY_LABEL: Record<number, string> = {
  0: "未測位",
  1: "単独",
  2: "DGPS",
  4: "RTK Fixed",
  5: "RTK Float",
}

export const FIX_TYPE_LABEL: Record<number, string> = {
  1: "未測位",
  2: "2D",
  3: "3D",
}

export const TALKER_LABEL: Record<string, string> = {
  GP: "GPS",
  GL: "GLONASS",
  GA: "Galileo",
  GB: "BeiDou",
  GI: "NavIC",
  GN: "GNSS (combined)",
  QZ: "QZSS",
  BD: "BeiDou (legacy)",
}

// Per docs/GR-M02Manual.md: signal IDs differ per constellation.
// 1: GPS L1 C/A, GLONASS L1, GALILEO E5a, BEIDOU B1I, NavIC L5
// 4: BEIDOU B2a; 7: GALILEO E1-BC; 8: GPS L5Q (and QZSS L5Q)
const SIGNAL_LABEL: Record<string, Record<string, string>> = {
  GP: { "1": "L1 C/A", "8": "L5Q" },
  GL: { "1": "L1" },
  GA: { "1": "E5a", "7": "E1-BC" },
  GB: { "1": "B1I", "4": "B2a" },
  GI: { "1": "L5" },
  QZ: { "1": "L1 C/A", "8": "L5Q" },
}

export function signalLabel(talker: string, signalId: string | null): string | null {
  if (!signalId) return null
  return SIGNAL_LABEL[talker]?.[signalId] ?? `Signal ${signalId}`
}

export function knotsToMps(knots: number | null): number | null {
  if (knots === null) return null
  return knots * 0.5144444444
}
