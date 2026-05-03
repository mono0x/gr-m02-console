import { formatLat, formatLon, formatNumber } from "@/lib/nmea-format"
import { useNmeaStore } from "@/store/nmea-store"
import { StatusCard, StatusRow } from "./StatusCard"

export function PositionCard() {
  const position = useNmeaStore((s) => s.position)
  const lastUpdate = position.updatedAt > 0 ? new Date(position.updatedAt).toLocaleTimeString() : "—"
  return (
    <StatusCard title="位置情報" contentClassName="grid gap-1.5 text-sm">
      <StatusRow label="緯度" value={formatLat(position.lat)} />
      <StatusRow label="経度" value={formatLon(position.lon)} />
      <StatusRow label="海抜高度" value={formatNumber(position.altitude, 1, "m")} />
      <StatusRow label="ジオイド高" value={formatNumber(position.geoidSep, 1, "m")} />
      <StatusRow label="最終更新" value={lastUpdate} />
    </StatusCard>
  )
}
