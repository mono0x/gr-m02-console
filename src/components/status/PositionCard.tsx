import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLat, formatLon, formatNumber } from "@/lib/nmea-format";
import { useNmeaStore } from "@/store/nmea-store";

export function PositionCard() {
  const position = useNmeaStore((s) => s.position);
  const lastUpdate = position.updatedAt > 0 ? new Date(position.updatedAt).toLocaleTimeString() : "—";
  return (
    <Card>
      <CardHeader>
        <CardTitle>位置情報</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <Row label="緯度" value={formatLat(position.lat)} />
        <Row label="経度" value={formatLon(position.lon)} />
        <Row label="海抜高度" value={formatNumber(position.altitude, 1, "m")} />
        <Row label="ジオイド高" value={formatNumber(position.geoidSep, 1, "m")} />
        <Row label="最終更新" value={lastUpdate} />
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
