import { formatNumber, knotsToMps } from "@/lib/nmea-format"
import { useNmeaStore } from "@/store/nmea-store"
import { StatusCard, StatusRow } from "./StatusCard"

export function MotionCard() {
  const motion = useNmeaStore((s) => s.motion)
  const time = useNmeaStore((s) => s.time)
  const speedMps = knotsToMps(motion.speedKnots)
  return (
    <StatusCard title="移動" contentClassName="grid gap-1.5 text-sm">
      <StatusRow label="速度 (knots)" value={formatNumber(motion.speedKnots, 2)} />
      <StatusRow label="速度 (km/h)" value={formatNumber(motion.speedKmh, 2)} />
      <StatusRow label="速度 (m/s)" value={formatNumber(speedMps, 2)} />
      <StatusRow label="進行方位 (true)" value={formatNumber(motion.courseTrue, 1, "°")} />
      <StatusRow label="UTC" value={time.utc ?? "—"} />
      <StatusRow label="Date" value={time.date ?? "—"} />
    </StatusCard>
  )
}
