import type { GsvData, SatelliteInfo, Talker } from "./types";

interface PendingGsv {
  totalMessages: number;
  satsInView: number;
  parts: Map<number, SatelliteInfo[]>;
  signalId: string | null;
}

export interface SatelliteSet {
  talker: Talker;
  satsInView: number;
  satellites: SatelliteInfo[];
  signalId: string | null;
}

export function satelliteSetKey(talker: Talker, signalId: string | null): string {
  return `${talker}|${signalId ?? ""}`;
}

export class GsvAggregator {
  private pending = new Map<string, PendingGsv>();

  ingest(talker: Talker, data: GsvData): SatelliteSet | null {
    if (data.totalMessages <= 0 || data.messageNumber <= 0) return null;
    const key = satelliteSetKey(talker, data.signalId);
    const existing = this.pending.get(key);
    let session: PendingGsv;
    if (data.messageNumber === 1 || !existing || existing.totalMessages !== data.totalMessages) {
      session = {
        totalMessages: data.totalMessages,
        satsInView: data.satsInView,
        parts: new Map(),
        signalId: data.signalId,
      };
      this.pending.set(key, session);
    } else {
      session = existing;
      session.satsInView = data.satsInView;
    }
    session.parts.set(data.messageNumber, data.satellites);
    if (session.parts.size !== session.totalMessages) return null;

    const ordered: SatelliteInfo[] = [];
    for (let i = 1; i <= session.totalMessages; i++) {
      const part = session.parts.get(i);
      if (!part) return null;
      ordered.push(...part);
    }
    this.pending.delete(key);
    return { talker, satsInView: session.satsInView, satellites: ordered, signalId: session.signalId };
  }

  reset(): void {
    this.pending.clear();
  }
}
