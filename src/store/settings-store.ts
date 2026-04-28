import { create } from "zustand";

export interface SettingValueState {
  cid: string;
  fields: string[] | null;
  parsed: Record<string, unknown> | null;
  fetchedAt: number | null;
  error: string | null;
  loading: boolean;
}

interface SettingsStore {
  values: Record<string, SettingValueState>;
  setLoading: (cid: string, loading: boolean) => void;
  setValue: (cid: string, fields: string[], parsed: Record<string, unknown>) => void;
  setError: (cid: string, message: string) => void;
}

function emptyValue(cid: string): SettingValueState {
  return { cid, fields: null, parsed: null, fetchedAt: null, error: null, loading: false };
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  values: {},
  setLoading: (cid, loading) => {
    set((state) => {
      const current = state.values[cid] ?? emptyValue(cid);
      return { values: { ...state.values, [cid]: { ...current, loading } } };
    });
  },
  setValue: (cid, fields, parsed) => {
    set((state) => {
      const current = state.values[cid] ?? emptyValue(cid);
      return {
        values: {
          ...state.values,
          [cid]: { ...current, fields, parsed, fetchedAt: Date.now(), loading: false, error: null },
        },
      };
    });
  },
  setError: (cid, message) => {
    set((state) => {
      const current = state.values[cid] ?? emptyValue(cid);
      return { values: { ...state.values, [cid]: { ...current, loading: false, error: message } } };
    });
  },
}));
