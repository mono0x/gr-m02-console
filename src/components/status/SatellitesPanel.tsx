import { useMemo } from "react";
import { signalLabel, TALKER_LABEL } from "@/lib/nmea-format";
import { satelliteSetKey, type SatelliteSet } from "@/nmea/aggregator";
import type { SatelliteInfo, Talker } from "@/nmea/types";
import { useNmeaStore } from "@/store/nmea-store";
import { StatusCard } from "./StatusCard";

const TALKER_ORDER: Talker[] = ["GP", "GL", "GA", "GB", "GI", "QZ"];
const TALKER_RANK = new Map<string, number>(TALKER_ORDER.map((t, i) => [t, i]));

function compareSets(a: SatelliteSet, b: SatelliteSet): number {
  const ra = TALKER_RANK.get(a.talker) ?? TALKER_ORDER.length;
  const rb = TALKER_RANK.get(b.talker) ?? TALKER_ORDER.length;
  if (ra !== rb) return ra - rb;
  if (a.talker !== b.talker) return a.talker.localeCompare(b.talker);
  return (a.signalId ?? "").localeCompare(b.signalId ?? "");
}

export function SatellitesPanel() {
  const satellites = useNmeaStore((s) => s.satellites);
  const ordered = useMemo(() => Object.values(satellites).sort(compareSets), [satellites]);

  return (
    <StatusCard title="衛星" contentClassName="space-y-2">
      {ordered.length === 0 && <div className="text-sm text-muted-foreground">受信なし</div>}
      {ordered.map((set) => (
        <SatelliteGroup key={satelliteSetKey(set.talker, set.signalId)} set={set} />
      ))}
    </StatusCard>
  );
}

function SatelliteGroup({ set }: { set: SatelliteSet }) {
  const sorted = useMemo(
    () => [...set.satellites].sort((a, b) => Number(a.prn) - Number(b.prn)),
    [set.satellites],
  );
  const talkerName = TALKER_LABEL[set.talker] ?? set.talker;
  const signal = signalLabel(set.talker, set.signalId);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-medium">
          {talkerName}
          {signal && <span className="ml-1.5 font-normal text-muted-foreground">{signal}</span>}
        </h3>
        <span className="text-xs text-muted-foreground">{set.satsInView}</span>
      </div>
      <div className="mt-0.5 grid grid-cols-[repeat(auto-fit,minmax(34px,1fr))] gap-0.5">
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
    <div className="flex flex-col items-center">
      <div className="flex h-6 w-full items-end overflow-hidden rounded-sm border bg-muted">
        <div className={`w-full ${colorClass}`} style={{ height: `${heightPercent}%` }} />
      </div>
      <div className="text-[10px] tabular-nums leading-tight">
        <span className="text-muted-foreground">{sat.prn}</span>
        <span className="ml-1">{tracked ? snr : "—"}</span>
      </div>
    </div>
  );
}
