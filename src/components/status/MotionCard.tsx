import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, knotsToMps } from "@/lib/nmea-format";
import { useNmeaStore } from "@/store/nmea-store";

export function MotionCard() {
  const motion = useNmeaStore((s) => s.motion);
  const time = useNmeaStore((s) => s.time);
  const speedMps = knotsToMps(motion.speedKnots);
  return (
    <Card>
      <CardHeader>
        <CardTitle>移動</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <Row label="速度 (knots)" value={formatNumber(motion.speedKnots, 2)} />
        <Row label="速度 (km/h)" value={formatNumber(motion.speedKmh, 2)} />
        <Row label="速度 (m/s)" value={formatNumber(speedMps, 2)} />
        <Row label="進行方位 (true)" value={formatNumber(motion.courseTrue, 1, "°")} />
        <Row label="UTC" value={time.utc ?? "—"} />
        <Row label="Date" value={time.date ?? "—"} />
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
