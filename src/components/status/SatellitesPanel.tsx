import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TALKER_LABEL } from "@/lib/nmea-format";
import type { SatelliteSet } from "@/nmea/aggregator";
import type { SatelliteInfo, Talker } from "@/nmea/types";
import { useNmeaStore } from "@/store/nmea-store";

const TALKER_ORDER: Talker[] = ["GP", "GL", "GA", "GB", "GI", "QZ"];

export function SatellitesPanel() {
  const satellites = useNmeaStore((s) => s.satellites);
  const known = TALKER_ORDER.filter((t) => satellites[t]);
  const others = Object.keys(satellites).filter((t) => !TALKER_ORDER.includes(t));
  const list = [...known, ...others];

  return (
    <Card>
      <CardHeader>
        <CardTitle>衛星</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {list.length === 0 && <div className="text-sm text-muted-foreground">受信なし</div>}
        {list.map((talker) => {
          const set = satellites[talker];
          if (!set) return null;
          return <SatelliteGroup key={talker} set={set} />;
        })}
      </CardContent>
    </Card>
  );
}

function SatelliteGroup({ set }: { set: SatelliteSet }) {
  const sorted = [...set.satellites].sort((a, b) => Number(a.prn) - Number(b.prn));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{TALKER_LABEL[set.talker] ?? set.talker}</h3>
        <span className="text-xs text-muted-foreground">{set.satsInView} 衛星</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1">
        {sorted.map((sat) => (
          <SnrCell key={sat.prn} sat={sat} />
        ))}
      </div>
    </div>
  );
}

function SnrCell({ sat }: { sat: SatelliteInfo }) {
  const snr = sat.snr;
  const tracked = snr !== null && snr > 0;
  const heightPercent = snr !== null ? Math.min(100, (snr / 50) * 100) : 0;
  const colorClass = !tracked
    ? "bg-muted"
    : snr! >= 50
      ? "bg-blue-500"
      : snr! >= 40
        ? "bg-emerald-500"
        : snr! >= 30
          ? "bg-amber-500"
          : "bg-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-12 w-full items-end overflow-hidden rounded-sm border bg-muted">
        <div className={`w-full ${colorClass}`} style={{ height: `${heightPercent}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">{sat.prn}</span>
      <span className="text-[10px] tabular-nums">{tracked ? snr : "—"}</span>
    </div>
  );
}
