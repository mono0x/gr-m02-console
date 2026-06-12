export function parseDdmm(value: string, hemi: string): number | null {
  if (!value || !hemi) return null
  const dotIndex = value.indexOf(".")
  const intPart = dotIndex < 0 ? value : value.slice(0, dotIndex)
  if (intPart.length < 3) return null
  const degLen = intPart.length - 2
  const degrees = Number(value.slice(0, degLen))
  const minutes = Number(value.slice(degLen))
  if (Number.isNaN(degrees) || Number.isNaN(minutes)) return null
  let result = degrees + minutes / 60
  if (hemi === "S" || hemi === "W") result = -result
  return result
}

export function parseUtcTime(value: string): string | null {
  if (!/^\d{6}(\.\d+)?$/.test(value)) return null
  const hh = value.slice(0, 2)
  const mm = value.slice(2, 4)
  const ss = value.slice(4)
  return `${hh}:${mm}:${ss}`
}

export function parseUtcDate(value: string): string | null {
  if (!/^\d{6}$/.test(value)) return null
  const dd = value.slice(0, 2)
  const mm = value.slice(2, 4)
  const yy = Number(value.slice(4, 6))
  const year = yy >= 80 ? 1900 + yy : 2000 + yy
  return `${year}-${mm}-${dd}`
}
