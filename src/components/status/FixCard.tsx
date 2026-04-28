import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FIX_QUALITY_LABEL, FIX_TYPE_LABEL, formatNumber } from "@/lib/nmea-format";
import { useNmeaStore } from "@/store/nmea-store";

export function FixCard() {
  const fix = useNmeaStore((s) => s.fix);
  const fixQualityLabel =
    fix.fixQuality !== null ? (FIX_QUALITY_LABEL[fix.fixQuality] ?? `不明 (${fix.fixQuality})`) : "—";
  const fixTypeLabel = fix.fixType !== null ? (FIX_TYPE_LABEL[fix.fixType] ?? "—") : "—";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Fix
          <Badge variant={fix.status === "A" ? "default" : "outline"}>{fix.status === "A" ? "Valid" : "Invalid"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <Row label="Fix Quality" value={fixQualityLabel} />
        <Row label="Fix Type" value={fixTypeLabel} />
        <Row label="使用衛星数" value={fix.satsUsed !== null ? String(fix.satsUsed) : "—"} />
        <Row label="HDOP" value={formatNumber(fix.hdop, 2)} />
        <Row label="PDOP" value={formatNumber(fix.pdop, 2)} />
        <Row label="VDOP" value={formatNumber(fix.vdop, 2)} />
        <Row label="Mode" value={fix.modeIndicator ?? "—"} />
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
