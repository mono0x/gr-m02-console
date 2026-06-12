import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { buildPairSentence } from "@/pair/encode"
import { DATUM_OPTIONS, DGPS_MODE_OPTIONS, NMEA_TYPE_LABEL, PAIR_CATALOG, PAIR_COMMANDS } from "@/pair/catalog"
import { sendPairCommand } from "@/pair/runtime"
import { formatPairError, type PairCommandSpec } from "@/pair/types"
import { useConnectionStore } from "@/store/connection-store"
import { useSettingsStore } from "@/store/settings-store"
import { CommandArgsForm, defaultArgValues } from "../console/CommandArgsForm"

const REFRESH_TARGETS = PAIR_COMMANDS.filter((c) => c.resultKind === "ack-and-followup")
  .filter((c) => c.cid !== "865") // 865 needs port_index argument; refresh handles UART0 explicitly
  .filter((c) => c.args.length === 0)
  .map((c) => c.cid)

const BAUD_RATE_GET_ARGS = ["0", "0"] // UART0
const NMEA_TYPES = Object.keys(NMEA_TYPE_LABEL)

interface EditTarget {
  setSpec: PairCommandSpec // the setter command (e.g. 062)
  refreshSpec?: PairCommandSpec | undefined // the corresponding getter (e.g. 063)
  initialArgs?: string[]
}

export function SettingsView() {
  const isConnected = useConnectionStore((s) => s.state === "connected")
  const values = useSettingsStore((s) => s.values)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [editValues, setEditValues] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  async function refreshAll() {
    if (!isConnected) return
    for (const cid of REFRESH_TARGETS) {
      await fetchValue(cid)
    }
    await fetchValue("063", ["-1"])
    for (const t of NMEA_TYPES) {
      await fetchValue("063", [t])
    }
    await fetchValue("865", BAUD_RATE_GET_ARGS)
  }

  async function fetchValue(cid: string, args: string[] = []) {
    const spec = PAIR_CATALOG[cid]
    if (!spec) return
    const key = settingKey(cid, args)
    useSettingsStore.getState().setLoading(key, true)
    try {
      const response = await sendPairCommand({ cid, args })
      const fields = response.followUp?.fields ?? []
      const parsed = spec.parseFollowUp ? spec.parseFollowUp(fields) : { fields }
      useSettingsStore.getState().setValue(key, fields, parsed)
    } catch (err) {
      useSettingsStore.getState().setError(key, formatPairError(err))
    }
  }

  function openEditFor(getCid: string, setCid: string, currentArgs: string[] = []) {
    const setSpec = PAIR_CATALOG[setCid]
    const refreshSpec = PAIR_CATALOG[getCid]
    if (!setSpec) return
    setEditTarget({
      setSpec,
      ...(refreshSpec ? { refreshSpec } : {}),
      ...(currentArgs.length > 0 ? { initialArgs: currentArgs } : {}),
    })
    setEditValues(currentArgs.length > 0 ? currentArgs : defaultArgValues(setSpec))
  }

  async function submitEdit() {
    if (!editTarget) return
    setSaving(true)
    try {
      await sendPairCommand({ cid: editTarget.setSpec.cid, args: editValues })
      toast.success(`PAIR${editTarget.setSpec.cid} 設定しました`)
      if (editTarget.refreshSpec) {
        await fetchValue(editTarget.refreshSpec.cid)
      }
      setEditTarget(null)
    } catch (err) {
      toast.error("設定に失敗しました", { description: formatPairError(err) })
    } finally {
      setSaving(false)
    }
  }

  async function saveNvram() {
    if (!isConnected) return
    const ok = window.confirm(
      "PAIR003 で GNSS を停止 → PAIR513 で NVRAM へ保存 → PAIR002 で再開 します。続けますか?",
    )
    if (!ok) return

    try {
      await sendPairCommand({ cid: "003" })
    } catch (err) {
      toast.error("GNSS 停止に失敗しました", { description: formatPairError(err) })
      return
    }

    let saveError: unknown
    try {
      await sendPairCommand({ cid: "513" })
    } catch (err) {
      saveError = err
    }

    try {
      await sendPairCommand({ cid: "002" })
    } catch (err) {
      toast.error("GNSS 再開に失敗しました", { description: formatPairError(err) })
    }

    if (saveError !== undefined) {
      toast.error("NVRAM 保存に失敗しました", { description: formatPairError(saveError) })
    } else {
      toast.success("NVRAM へ保存しました")
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
            const key = settingKey(row.getCid, row.getArgs)
            const value = values[key]
            return (
              <SettingRow
                key={key}
                label={row.label}
                describe={row.describe}
                value={value}
                onRefresh={() => void fetchValue(row.getCid, row.getArgs)}
                onEdit={() =>
                  row.setCid &&
                  openEditFor(row.getCid, row.setCid, row.toEditArgs ? row.toEditArgs(value?.fields ?? []) : [])
                }
                editable={isConnected && !!row.setCid}
              />
            )
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
  )
}

function settingKey(cid: string, args: string[]): string {
  return args.length === 0 ? cid : `${cid}:${args.join(",")}`
}

interface RowDef {
  label: string
  describe: (value: Record<string, unknown> | null) => string
  getCid: string
  getArgs: string[]
  setCid?: string
  toEditArgs?: (fields: string[]) => string[]
}

const SETTINGS_ROWS: RowDef[] = [
  {
    label: "Fix Rate",
    getCid: "051",
    getArgs: [],
    setCid: "050",
    describe: (v) => describeNumeric(v?.["rateMs"], (n) => `${n} ms`),
    toEditArgs: (f) => [f[0] ?? ""],
  },
  {
    label: "SNR Threshold",
    getCid: "059",
    getArgs: [],
    setCid: "058",
    describe: (v) => describeNumeric(v?.["minSnr"], (n) => `min ${n}`),
    toEditArgs: (f) => [f[0] ?? ""],
  },
  {
    label: "DR Limit",
    getCid: "061",
    getArgs: [],
    setCid: "060",
    describe: (v) => describeNumeric(v?.["drLimit"], (n) => String(n)),
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
    describe: (v) => describeNumeric(v?.["hdop"], (n) => String(n)),
    toEditArgs: (f) => [f[0] ?? ""],
  },
  {
    label: "Static Threshold",
    getCid: "071",
    getArgs: [],
    setCid: "070",
    describe: (v) => describeNumeric(v?.["speedMs"], (n) => `${n} m/s`),
    toEditArgs: (f) => [f[0] ?? ""],
  },
  {
    label: "Elevation Mask",
    getCid: "073",
    getArgs: [],
    setCid: "072",
    describe: (v) => describeNumeric(v?.["degrees"], (n) => `${n}°`),
    toEditArgs: (f) => [f[0] ?? ""],
  },
  {
    label: "Datum",
    getCid: "077",
    getArgs: [],
    setCid: "076",
    describe: (v) => describeOption(DATUM_OPTIONS, v?.["datum"]),
    toEditArgs: (f) => [f[0] ?? "0"],
  },
  {
    label: "Static Mode",
    getCid: "093",
    getArgs: [],
    setCid: "092",
    describe: describeEnabled,
    toEditArgs: (f) => [f[0] ?? "0"],
  },
  {
    label: "DGPS Source",
    getCid: "401",
    getArgs: [],
    setCid: "400",
    describe: (v) => describeOption(DGPS_MODE_OPTIONS, v?.["mode"]),
    toEditArgs: (f) => [f[0] ?? "0"],
  },
  {
    label: "SBAS",
    getCid: "411",
    getArgs: [],
    setCid: "410",
    describe: describeEnabled,
    toEditArgs: (f) => [f[0] ?? "0"],
  },
  {
    label: "QZSS SLAS",
    getCid: "421",
    getArgs: [],
    setCid: "420",
    describe: describeEnabled,
    toEditArgs: (f) => [f[0] ?? "0"],
  },
  {
    label: "NMEA Output (-1=all)",
    getCid: "063",
    getArgs: ["-1"],
    describe: (v) => (v?.["fields"] ? JSON.stringify(v["fields"]) : "—"),
  },
  ...NMEA_TYPES.map(
    (t): RowDef => ({
      label: `NMEA Output Rate · ${NMEA_TYPE_LABEL[t] ?? t}`,
      getCid: "063",
      getArgs: [t],
      setCid: "062",
      describe: (v) => describeNumeric(v?.["rate"], (n) => `${n} fix(es)`),
      toEditArgs: (f) => [f[0] ?? t, f[1] ?? "1"],
    }),
  ),
  {
    label: "Baud Rate (UART0)",
    getCid: "865",
    getArgs: BAUD_RATE_GET_ARGS,
    setCid: "864",
    describe: (v) => describeNumeric(v?.["baudRate"], (n) => `${n} bps`),
    toEditArgs: (f) => ["0", "0", f[0] ?? "115200"],
  },
]

function describeNumeric(value: unknown, format: (n: number) => string): string {
  return typeof value === "number" ? format(value) : "—"
}

function describeFlags(v: Record<string, unknown> | null, keys: string[]): string {
  if (!v) return "—"
  return keys.map((k) => `${k}:${v[k] === "1" || v[k] === 1 ? "✓" : "—"}`).join(" ")
}

function describeEnabled(v: Record<string, unknown> | null): string {
  if (v?.["enabled"] === undefined) return "—"
  return v["enabled"] ? "Enabled" : "Disabled"
}

function describeOption(options: { value: string; label: string }[], value: unknown): string {
  const found = options.find((o) => o.value === value)
  if (found) return found.label
  return typeof value === "string" ? value : "—"
}

interface SettingRowProps {
  label: string
  describe: (value: Record<string, unknown> | null) => string
  value?: import("@/store/settings-store").SettingValueState
  onRefresh: () => void
  onEdit: () => void
  editable: boolean
}

function SettingRow({ label, describe, value, onRefresh, onEdit, editable }: SettingRowProps) {
  const text = value ? describe(value.parsed) : "—"
  const fetchedAt = value?.fetchedAt ? new Date(value.fetchedAt).toLocaleTimeString() : "—"
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
  )
}
