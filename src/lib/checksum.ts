export function computeChecksum(body: string): string {
  let xor = 0
  for (let i = 0; i < body.length; i++) {
    xor ^= body.charCodeAt(i)
  }
  return xor.toString(16).toUpperCase().padStart(2, "0")
}

export function verifyChecksum(line: string): boolean {
  if (!line.startsWith("$")) return false
  const star = line.lastIndexOf("*")
  if (star < 0 || star + 3 > line.length) return false
  const body = line.slice(1, star)
  const expected = line.slice(star + 1, star + 3).toUpperCase()
  return computeChecksum(body) === expected
}

export function attachChecksum(body: string): string {
  return `$${body}*${computeChecksum(body)}`
}
