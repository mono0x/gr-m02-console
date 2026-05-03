import { Badge } from "@/components/ui/badge"
import { FIX_QUALITY_LABEL, FIX_TYPE_LABEL, formatNumber } from "@/lib/nmea-format"
import { useNmeaStore } from "@/store/nmea-store"
import { StatusCard, StatusRow } from "./StatusCard"

export function FixCard() {
  const fix = useNmeaStore((s) => s.fix)
  const fixQualityLabel =
    fix.fixQuality !== null ? (FIX_QUALITY_LABEL[fix.fixQuality] ?? `不明 (${fix.fixQuality})`) : "—"
  const fixTypeLabel = fix.fixType !== null ? (FIX_TYPE_LABEL[fix.fixType] ?? "—") : "—"
  return (
    <StatusCard
      title={
        <>
          Fix
          <Badge variant={fix.status === "A" ? "default" : "outline"}>
            {fix.status === "A" ? "Valid" : "Invalid"}
          </Badge>
        </>
      }
      titleClassName="flex items-center gap-2"
      contentClassName="grid gap-1.5 text-sm"
    >
      <StatusRow label="Fix Quality" value={fixQualityLabel} />
      <StatusRow label="Fix Type" value={fixTypeLabel} />
      <StatusRow label="使用衛星数" value={fix.satsUsed !== null ? String(fix.satsUsed) : "—"} />
      <StatusRow label="HDOP" value={formatNumber(fix.hdop, 2)} />
      <StatusRow label="PDOP" value={formatNumber(fix.pdop, 2)} />
      <StatusRow label="VDOP" value={formatNumber(fix.vdop, 2)} />
      <StatusRow label="Mode" value={fix.modeIndicator ?? "—"} />
    </StatusCard>
  )
}
