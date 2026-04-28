import { FixCard } from "@/components/status/FixCard";
import { MotionCard } from "@/components/status/MotionCard";
import { PositionCard } from "@/components/status/PositionCard";
import { SatellitesPanel } from "@/components/status/SatellitesPanel";

export function StatusView() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="grid gap-4">
        <PositionCard />
        <FixCard />
        <MotionCard />
      </div>
      <SatellitesPanel />
    </div>
  );
}
