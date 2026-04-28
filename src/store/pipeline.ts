import { GsvAggregator } from "@/nmea/aggregator";
import {
  decodeGGA,
  decodeGLL,
  decodeGSA,
  decodeGST,
  decodeGSV,
  decodeRMC,
  decodeVTG,
  decodeZDA,
  parseSentence,
} from "@/nmea/parser";
import { pairQueue } from "@/pair/runtime";
import { serialManager, subscribeSerialLine } from "@/store/connection-store";
import { useLogStore } from "@/store/log-store";
import { useNmeaStore } from "@/store/nmea-store";

let started = false;
const aggregator = new GsvAggregator();

export function startPipeline(): void {
  if (started) return;
  started = true;
  subscribeSerialLine((event) => {
    useLogStore.getState().push(event.text, event.dir, event.ts);
    if (event.dir !== "rx") return;
    routeRx(event.text, event.ts);
  });
  serialManager.onState((state) => {
    if (state === "disconnected" || state === "error") {
      aggregator.reset();
      pairQueue.cancelAll(`Connection state: ${state}`);
    }
  });
}

function routeRx(line: string, ts: number): void {
  const parsed = parseSentence(line);
  switch (parsed.kind) {
    case "pair-ack":
      pairQueue.ingestAck(parsed);
      return;
    case "pair":
      pairQueue.ingestPair(parsed);
      return;
    case "nmea":
      break;
    default:
      return;
  }
  const store = useNmeaStore.getState();
  switch (parsed.type) {
    case "GGA":
      store.ingestGGA(decodeGGA(parsed.fields), ts);
      return;
    case "RMC":
      store.ingestRMC(decodeRMC(parsed.fields), ts);
      return;
    case "VTG":
      store.ingestVTG(decodeVTG(parsed.fields));
      return;
    case "GSA":
      store.ingestGSA(decodeGSA(parsed.fields));
      return;
    case "GLL":
      store.ingestGLL(decodeGLL(parsed.fields), ts);
      return;
    case "GST":
      store.ingestGST(decodeGST(parsed.fields));
      return;
    case "ZDA":
      store.ingestZDA(decodeZDA(parsed.fields));
      return;
    case "GSV": {
      const data = decodeGSV(parsed.fields);
      const result = aggregator.ingest(parsed.talker, data);
      if (result) store.ingestSatellites(result);
      return;
    }
    default:
      return;
  }
}
