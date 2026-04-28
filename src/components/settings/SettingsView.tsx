import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildPairSentence } from "@/pair/encode";
import { PAIR_CATALOG, PAIR_COMMANDS } from "@/pair/catalog";
import { sendPairCommand } from "@/pair/runtime";
import { PairError, type PairCommandSpec } from "@/pair/types";
import { useConnectionStore } from "@/store/connection-store";
import { useSettingsStore } from "@/store/settings-store";
import { CommandArgsForm, defaultArgValues } from "../console/CommandArgsForm";

const REFRESH_TARGETS = PAIR_COMMANDS.filter((c) => c.resultKind === "ack-and-followup")
  .filter((c) => c.cid !== "865") // 865 needs port_index argument; refresh handles UART0 explicitly
  .filter((c) => c.args.length === 0)
  .map((c) => c.cid);

const BAUD_RATE_GET_ARGS = ["0", "0"]; // UART0
const NMEA_TYPES = ["0", "1", "2", "3", "4", "5", "6"];

interface EditTarget {
  setSpec: PairCommandSpec; // the setter command (e.g. 062)
  refreshSpec?: PairCommandSpec | undefined; // the corresponding getter (e.g. 063)
  initialArgs?: string[];
}

export function SettingsView() {
  const isConnected = useConnectionStore((s) => s.state === "connected");
  const values = useSettingsStore((s) => s.values);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editValues, setEditValues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function refreshAll() {
    if (!isConnected) return;
    for (const cid of REFRESH_TARGETS) {
      await fetchValue(cid);
    }
    await fetchValue("063", ["-1"]);
    for (const t of NMEA_TYPES) {
      await fetchValue("063", [t]);
    }
    await fetchValue("865", BAUD_RATE_GET_ARGS);
  }

  async function fetchValue(cid: string, args: string[] = []) {
    const spec = PAIR_CATALOG[cid];
    if (!spec) return;
    const key = settingKey(cid, args);
    useSettingsStore.getState().setLoading(key, true);
    try {
      const response = await sendPairCommand({ cid, args });
      const fields = response.followUp?.fields ?? [];
      const parsed = spec.parseFollowUp ? spec.parseFollowUp(fields) : { fields };
      useSettingsStore.getState().setValue(key, fields, parsed);
    } catch (err) {
      const message = err instanceof PairError ? `${err.kind}: ${err.message}` : String(err);
      useSettingsStore.getState().setError(key, message);
    }
  }

  function openEditFor(getCid: string, setCid: string, args: string[] = [], currentArgs: string[] = []) {
    const setSpec = PAIR_CATALOG[setCid];
    const refreshSpec = PAIR_CATALOG[getCid];
    if (!setSpec) return;
    setEditTarget({
      setSpec,
      ...(refreshSpec ? { refreshSpec } : {}),
      ...(currentArgs.length > 0 ? { initialArgs: currentArgs } : {}),
    });
    setEditValues(currentArgs.length > 0 ? currentArgs : defaultArgValues(setSpec));
    void args; // not used currently
  }

  async function submitEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      await sendPairCommand({ cid: editTarget.setSpec.cid, args: editValues });
      toast.success(`PAIR${editTarget.setSpec.cid} 設定しました`);
      if (editTarget.refreshSpec) {
        await fetchValue(editTarget.refreshSpec.cid);
      }
      setEditTarget(null);
    } catch (err) {
      const message = err instanceof PairError ? `${err.kind}: ${err.message}` : String(err);
      toast.error("設定に失敗しました", { description: message });
    } finally {
      setSaving(false);
    }
  }

  async function saveNvram() {
    if (!isConnected) return;
    const ok = window.confirm("PAIR513 で現在の設定を NVRAM に保存します。続けますか?");
    if (!ok) return;
    try {
      await sendPairCommand({ cid: "513" });
      toast.success("NVRAM へ保存しました");
    } catch (err) {
      const message = err instanceof PairError ? `${err.kind}: ${err.message}` : String(err);
      toast.error("NVRAM 保存に失敗しました", { description: message });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={() => void refreshAll()} disabled={!isConnected}>
          すべて取得
        </Button>
        <Button variant="secondary" onClick={() => void saveNvram()} disabled={!isConnected}>
          NVRAM へ保存 (PAIR513)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>主要設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {SETTINGS_ROWS.map((row) => {
            const key = settingKey(row.getCid, row.getArgs);
            const value = values[key];
            return (
              <SettingRow
                key={key}
                label={row.label}
                describe={row.describe}
                value={value}
                onRefresh={() => void fetchValue(row.getCid, row.getArgs)}
                onEdit={() =>
                  row.setCid &&
                  openEditFor(
                    row.getCid,
                    row.setCid,
                    row.getArgs,
                    row.toEditArgs ? row.toEditArgs(value?.fields ?? []) : [],
                  )
                }
                editable={isConnected && !!row.setCid}
              />
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              PAIR{editTarget?.setSpec.cid} {editTarget?.setSpec.name}
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{editTarget.setSpec.description}</p>
              <CommandArgsForm
                spec={editTarget.setSpec}
                values={editValues}
                onChange={setEditValues}
                disabled={saving}
              />
              <div className="grid gap-1.5">
                <span className="text-sm text-muted-foreground">送信プレビュー</span>
                <code className="rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                  {buildPairSentence(editTarget.setSpec.cid, editValues)}
                </code>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>
              キャンセル
            </Button>
            <Button onClick={() => void submitEdit()} disabled={saving}>
              送信
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function settingKey(cid: string, args: string[]): string {
  return args.length === 0 ? cid : `${cid}:${args.join(",")}`;
}

interface RowDef {
  label: string;
  describe: (value: Record<string, unknown> | null) => string;
  getCid: string;
  getArgs: string[];
  setCid?: string;
  toEditArgs?: (fields: string[]) => string[];
}

const SETTINGS_ROWS: RowDef[] = [
  {
    label: "Fix Rate",
    getCid: "051",
    getArgs: [],
    setCid: "050",
    describe: (v) => (v?.["rateMs"] !== undefined ? `${v["rateMs"]} ms` : "—"),
    toEditArgs: (f) => [f[0] ?? ""],
  },
  {
    label: "SNR Threshold",
    getCid: "059",
    getArgs: [],
    setCid: "058",
    describe: (v) => (v?.["minSnr"] !== undefined ? `min ${v["minSnr"]}` : "—"),
    toEditArgs: (f) => [f[0] ?? ""],
  },
  {
    label: "DR Limit",
    getCid: "061",
    getArgs: [],
    setCid: "060",
    describe: (v) => (v?.["drLimit"] !== undefined ? String(v["drLimit"]) : "—"),
    toEditArgs: (f) => [f[0] ?? ""],
  },
  {
    label: "GNSS Search Mode",
    getCid: "067",
    getArgs: [],
    setCid: "066",
    describe: (v) => describeFlags(v, ["GPS", "GLONASS", "Galileo", "BeiDou", "QZSS", "NavIC"]),
    toEditArgs: (f) => [f[0] ?? "1", f[1] ?? "1", f[2] ?? "1", f[3] ?? "1", f[4] ?? "1", f[5] ?? "0"],
  },
  {
    label: "HDOP Threshold",
    getCid: "069",
    getArgs: [],
    setCid: "068",
    describe: (v) => (v?.["hdop"] !== undefined ? String(v["hdop"]) : "—"),
    toEditArgs: (f) => [f[0] ?? ""],
  },
  {
    label: "Static Threshold",
    getCid: "071",
    getArgs: [],
    setCid: "070",
    describe: (v) => (v?.["speedMs"] !== undefined ? `${v["speedMs"]} m/s` : "—"),
    toEditArgs: (f) => [f[0] ?? ""],
  },
  {
    label: "Elevation Mask",
    getCid: "073",
    getArgs: [],
    setCid: "072",
    describe: (v) => (v?.["degrees"] !== undefined ? `${v["degrees"]}°` : "—"),
    toEditArgs: (f) => [f[0] ?? ""],
  },
  {
    label: "Datum",
    getCid: "077",
    getArgs: [],
    setCid: "076",
    describe: (v) => describeDatum(v?.["datum"] as string | undefined),
    toEditArgs: (f) => [f[0] ?? "0"],
  },
  {
    label: "Static Mode",
    getCid: "093",
    getArgs: [],
    setCid: "092",
    describe: (v) => (v?.["enabled"] !== undefined ? (v["enabled"] ? "Enabled" : "Disabled") : "—"),
    toEditArgs: (f) => [f[0] ?? "0"],
  },
  {
    label: "DGPS Source",
    getCid: "401",
    getArgs: [],
    setCid: "400",
    describe: (v) => describeDgps(v?.["mode"] as string | undefined),
    toEditArgs: (f) => [f[0] ?? "0"],
  },
  {
    label: "SBAS",
    getCid: "411",
    getArgs: [],
    setCid: "410",
    describe: (v) => (v?.["enabled"] !== undefined ? (v["enabled"] ? "Enabled" : "Disabled") : "—"),
    toEditArgs: (f) => [f[0] ?? "0"],
  },
  {
    label: "QZSS SLAS",
    getCid: "421",
    getArgs: [],
    setCid: "420",
    describe: (v) => (v?.["enabled"] !== undefined ? (v["enabled"] ? "Enabled" : "Disabled") : "—"),
    toEditArgs: (f) => [f[0] ?? "0"],
  },
  {
    label: "NMEA Output (-1=all)",
    getCid: "063",
    getArgs: ["-1"],
    describe: (v) => (v?.["fields"] ? JSON.stringify(v["fields"]) : "—"),
  },
  ...NMEA_TYPES.map((t): RowDef => ({
    label: `NMEA Output Rate · ${nmeaTypeLabel(t)}`,
    getCid: "063",
    getArgs: [t],
    setCid: "062",
    describe: (v) => (v?.["rate"] !== undefined ? `${v["rate"]} fix(es)` : "—"),
    toEditArgs: (f) => [f[0] ?? t, f[1] ?? "1"],
  })),
  {
    label: "Baud Rate (UART0)",
    getCid: "865",
    getArgs: BAUD_RATE_GET_ARGS,
    setCid: "864",
    describe: (v) => (v?.["baudRate"] !== undefined ? `${v["baudRate"]} bps` : "—"),
    toEditArgs: (f) => ["0", "0", f[0] ?? "115200"],
  },
];

function nmeaTypeLabel(t: string): string {
  switch (t) {
    case "0":
      return "GGA";
    case "1":
      return "GLL";
    case "2":
      return "GSA";
    case "3":
      return "GSV";
    case "4":
      return "RMC";
    case "5":
      return "VTG";
    case "6":
      return "ZDA";
    default:
      return t;
  }
}

function describeFlags(v: Record<string, unknown> | null, keys: string[]): string {
  if (!v) return "—";
  return keys
    .map((k) => `${k}:${v[k] === "1" || v[k] === 1 ? "✓" : "—"}`)
    .join(" ");
}

function describeDatum(d?: string): string {
  if (d === "0") return "WGS84 (0)";
  if (d === "1") return "TOKYO-M (1)";
  if (d === "2") return "TOKYO-A (2)";
  return d ?? "—";
}

function describeDgps(m?: string): string {
  if (m === "0") return "なし (0)";
  if (m === "1") return "RTCM (1)";
  if (m === "2") return "SBAS (2)";
  if (m === "3") return "SLAS (3)";
  return m ?? "—";
}

interface SettingRowProps {
  label: string;
  describe: (value: Record<string, unknown> | null) => string;
  value?: import("@/store/settings-store").SettingValueState;
  onRefresh: () => void;
  onEdit: () => void;
  editable: boolean;
}

function SettingRow({ label, describe, value, onRefresh, onEdit, editable }: SettingRowProps) {
  const text = value ? describe(value.parsed) : "—";
  const fetchedAt = value?.fetchedAt ? new Date(value.fetchedAt).toLocaleTimeString() : "—";
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="font-mono text-sm text-muted-foreground">{text}</div>
      </div>
      <div className="flex items-center gap-2">
        {value?.loading && <Badge variant="outline">取得中…</Badge>}
        {value?.error && <Badge variant="destructive">{value.error}</Badge>}
        <span className="text-xs text-muted-foreground">{fetchedAt}</span>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          取得
        </Button>
        {editable && (
          <Button size="sm" onClick={onEdit}>
            変更
          </Button>
        )}
      </div>
    </div>
  );
}
