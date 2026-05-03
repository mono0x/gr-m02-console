import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { satelliteSetKey, type SatelliteSet } from "@/nmea/aggregator"
import type { GgaData, GsaData, GllData, GstData, RmcData, VtgData, ZdaData } from "@/nmea/types"

export interface PositionState {
  lat: number | null
  lon: number | null
  altitude: number | null
  geoidSep: number | null
  updatedAt: number
}

export interface FixState {
  fixQuality: number | null
  fixType: 1 | 2 | 3 | null
  hdop: number | null
  pdop: number | null
  vdop: number | null
  satsUsed: number | null
  systemId: number | null
  modeIndicator: string | null
  status: "A" | "V" | null
}

export interface MotionState {
  speedKnots: number | null
  speedKmh: number | null
  courseTrue: number | null
  courseMag: number | null
}

export interface TimeState {
  utc: string | null
  date: string | null
}

export interface ErrorState {
  rangeRms: number | null
  stdMajor: number | null
  stdMinor: number | null
  stdLat: number | null
  stdLon: number | null
  stdAlt: number | null
}

interface NmeaStore {
  position: PositionState
  fix: FixState
  motion: MotionState
  time: TimeState
  errorStats: ErrorState
  satellites: Record<string, SatelliteSet>
  ingestGGA: (data: GgaData, ts: number) => void
  ingestRMC: (data: RmcData, ts: number) => void
  ingestVTG: (data: VtgData) => void
  ingestGSA: (data: GsaData) => void
  ingestGLL: (data: GllData, ts: number) => void
  ingestGST: (data: GstData) => void
  ingestZDA: (data: ZdaData) => void
  ingestSatellites: (set: SatelliteSet) => void
  reset: () => void
}

const initialPosition: PositionState = {
  lat: null,
  lon: null,
  altitude: null,
  geoidSep: null,
  updatedAt: 0,
}
const initialFix: FixState = {
  fixQuality: null,
  fixType: null,
  hdop: null,
  pdop: null,
  vdop: null,
  satsUsed: null,
  systemId: null,
  modeIndicator: null,
  status: null,
}
const initialMotion: MotionState = {
  speedKnots: null,
  speedKmh: null,
  courseTrue: null,
  courseMag: null,
}
const initialTime: TimeState = { utc: null, date: null }
const initialError: ErrorState = {
  rangeRms: null,
  stdMajor: null,
  stdMinor: null,
  stdLat: null,
  stdLon: null,
  stdAlt: null,
}

function shallowDiff<T extends object>(prev: T, next: T): boolean {
  for (const key in next) {
    if (!Object.is(prev[key], next[key])) return true
  }
  return false
}

export const useNmeaStore = create<NmeaStore>()(
  subscribeWithSelector((set) => ({
    position: initialPosition,
    fix: initialFix,
    motion: initialMotion,
    time: initialTime,
    errorStats: initialError,
    satellites: {},

    ingestGGA: (data, ts) => {
      set((state) => {
        const nextPosition: PositionState = {
          lat: data.lat,
          lon: data.lon,
          altitude: data.altitude,
          geoidSep: data.geoidSep,
          updatedAt: ts,
        }
        const nextFix: FixState = {
          ...state.fix,
          fixQuality: data.fixQuality,
          satsUsed: data.satsUsed,
          hdop: data.hdop ?? state.fix.hdop,
        }
        const nextTime: TimeState = { ...state.time, utc: data.utc ?? state.time.utc }
        const positionChanged = shallowDiff(state.position, nextPosition)
        const fixChanged = shallowDiff(state.fix, nextFix)
        const timeChanged = shallowDiff(state.time, nextTime)
        if (!positionChanged && !fixChanged && !timeChanged) return state
        return {
          ...state,
          position: positionChanged ? nextPosition : state.position,
          fix: fixChanged ? nextFix : state.fix,
          time: timeChanged ? nextTime : state.time,
        }
      })
    },

    ingestRMC: (data, ts) => {
      set((state) => {
        const nextPosition: PositionState =
          data.lat !== null && data.lon !== null
            ? { ...state.position, lat: data.lat, lon: data.lon, updatedAt: ts }
            : state.position
        const nextFix: FixState = {
          ...state.fix,
          status: data.status,
          modeIndicator: data.modeIndicator,
        }
        const nextMotion: MotionState = {
          ...state.motion,
          speedKnots: data.speedKnots,
          courseTrue: data.courseTrue,
        }
        const nextTime: TimeState = {
          utc: data.utc ?? state.time.utc,
          date: data.date ?? state.time.date,
        }
        const positionChanged = nextPosition !== state.position && shallowDiff(state.position, nextPosition)
        const fixChanged = shallowDiff(state.fix, nextFix)
        const motionChanged = shallowDiff(state.motion, nextMotion)
        const timeChanged = shallowDiff(state.time, nextTime)
        if (!positionChanged && !fixChanged && !motionChanged && !timeChanged) return state
        return {
          ...state,
          position: positionChanged ? nextPosition : state.position,
          fix: fixChanged ? nextFix : state.fix,
          motion: motionChanged ? nextMotion : state.motion,
          time: timeChanged ? nextTime : state.time,
        }
      })
    },

    ingestVTG: (data) => {
      set((state) => {
        const nextMotion: MotionState = {
          speedKnots: data.speedKnots,
          speedKmh: data.speedKmh,
          courseTrue: data.courseTrue,
          courseMag: data.courseMag,
        }
        const nextFix: FixState = {
          ...state.fix,
          modeIndicator: data.modeIndicator ?? state.fix.modeIndicator,
        }
        const motionChanged = shallowDiff(state.motion, nextMotion)
        const fixChanged = shallowDiff(state.fix, nextFix)
        if (!motionChanged && !fixChanged) return state
        return {
          ...state,
          motion: motionChanged ? nextMotion : state.motion,
          fix: fixChanged ? nextFix : state.fix,
        }
      })
    },

    ingestGSA: (data) => {
      set((state) => {
        const nextFix: FixState = {
          ...state.fix,
          fixType: data.fixType,
          pdop: data.pdop,
          hdop: data.hdop ?? state.fix.hdop,
          vdop: data.vdop,
          systemId: data.systemId ?? state.fix.systemId,
        }
        if (!shallowDiff(state.fix, nextFix)) return state
        return { ...state, fix: nextFix }
      })
    },

    ingestGLL: (data, ts) => {
      set((state) => {
        const nextPosition: PositionState =
          data.lat !== null && data.lon !== null
            ? { ...state.position, lat: data.lat, lon: data.lon, updatedAt: ts }
            : state.position
        const nextFix: FixState = {
          ...state.fix,
          status: data.status,
          modeIndicator: data.modeIndicator,
        }
        const positionChanged = nextPosition !== state.position && shallowDiff(state.position, nextPosition)
        const fixChanged = shallowDiff(state.fix, nextFix)
        if (!positionChanged && !fixChanged) return state
        return {
          ...state,
          position: positionChanged ? nextPosition : state.position,
          fix: fixChanged ? nextFix : state.fix,
        }
      })
    },

    ingestGST: (data) => {
      set((state) => {
        const next: ErrorState = {
          rangeRms: data.rangeRms,
          stdMajor: data.stdMajor,
          stdMinor: data.stdMinor,
          stdLat: data.stdLat,
          stdLon: data.stdLon,
          stdAlt: data.stdAlt,
        }
        if (!shallowDiff(state.errorStats, next)) return state
        return { ...state, errorStats: next }
      })
    },

    ingestZDA: (data) => {
      set((state) => {
        const date =
          data.year && data.month && data.day
            ? `${String(data.year).padStart(4, "0")}-${String(data.month).padStart(2, "0")}-${String(data.day).padStart(2, "0")}`
            : state.time.date
        const nextTime: TimeState = { utc: data.utc ?? state.time.utc, date }
        if (!shallowDiff(state.time, nextTime)) return state
        return { ...state, time: nextTime }
      })
    },

    ingestSatellites: (setData) => {
      set((state) => ({
        ...state,
        satellites: {
          ...state.satellites,
          [satelliteSetKey(setData.talker, setData.signalId)]: setData,
        },
      }))
    },

    reset: () =>
      set({
        position: initialPosition,
        fix: initialFix,
        motion: initialMotion,
        time: initialTime,
        errorStats: initialError,
        satellites: {},
      }),
  })),
)
