export type Talker = "GP" | "GL" | "GA" | "GB" | "GN" | "QZ" | "GI" | "BD" | string;

export type NmeaType = "GGA" | "GLL" | "GSA" | "GSV" | "RMC" | "VTG" | "ZDA" | "GRS" | "GST" | "GNS" | string;

export type FixQuality = 0 | 1 | 2 | 4 | 5;
export type FixMode = "1" | "2" | "3";

export interface GgaData {
  utc: string | null;
  lat: number | null;
  lon: number | null;
  fixQuality: FixQuality | null;
  satsUsed: number | null;
  hdop: number | null;
  altitude: number | null;
  geoidSep: number | null;
}

export interface RmcData {
  utc: string | null;
  date: string | null;
  status: "A" | "V" | null;
  lat: number | null;
  lon: number | null;
  speedKnots: number | null;
  courseTrue: number | null;
  modeIndicator: string | null;
}

export interface VtgData {
  courseTrue: number | null;
  courseMag: number | null;
  speedKnots: number | null;
  speedKmh: number | null;
  modeIndicator: string | null;
}

export interface GsaData {
  mode1: "M" | "A" | null;
  fixType: 1 | 2 | 3 | null;
  satsUsed: string[];
  pdop: number | null;
  hdop: number | null;
  vdop: number | null;
  systemId: number | null;
}

export interface SatelliteInfo {
  prn: string;
  elevation: number | null;
  azimuth: number | null;
  snr: number | null;
}

export interface GsvData {
  totalMessages: number;
  messageNumber: number;
  satsInView: number;
  satellites: SatelliteInfo[];
  signalId: string | null;
}

export interface GllData {
  lat: number | null;
  lon: number | null;
  utc: string | null;
  status: "A" | "V" | null;
  modeIndicator: string | null;
}

export interface GstData {
  utc: string | null;
  rangeRms: number | null;
  stdMajor: number | null;
  stdMinor: number | null;
  orient: number | null;
  stdLat: number | null;
  stdLon: number | null;
  stdAlt: number | null;
}

export interface ZdaData {
  utc: string | null;
  day: number | null;
  month: number | null;
  year: number | null;
}

export type PairAckCode = 0 | 1 | 2 | 3 | 4 | 5;

export interface ParsedNmea {
  kind: "nmea";
  talker: Talker;
  type: NmeaType;
  fields: string[];
  raw: string;
}

export interface ParsedPair {
  kind: "pair";
  cid: string;
  fields: string[];
  raw: string;
}

export interface ParsedPairAck {
  kind: "pair-ack";
  cid: string;
  result: PairAckCode;
  raw: string;
}

export interface ParsedUnknown {
  kind: "unknown";
  raw: string;
  reason: "no-dollar" | "no-checksum" | "checksum-mismatch" | "empty";
}

export type ParsedSentence = ParsedNmea | ParsedPair | ParsedPairAck | ParsedUnknown;
