import { useShallow } from "zustand/shallow"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SUPPORTED_BAUD_RATES } from "@/serial/types"
import { useConnectionStore } from "@/store/connection-store"

const STATE_LABEL: Record<string, string> = {
  disconnected: "未接続",
  connecting: "接続中…",
  connected: "接続済み",
  error: "エラー",
}

const STATE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  disconnected: "outline",
  connecting: "secondary",
  connected: "default",
  error: "destructive",
}

export function ConnectionBar() {
  const { state, baudRate, error, isSupported, connect, disconnect, setBaudRate } = useConnectionStore(
    useShallow((s) => ({
      state: s.state,
      baudRate: s.baudRate,
      error: s.error,
      isSupported: s.isSupported,
      connect: s.connect,
      disconnect: s.disconnect,
      setBaudRate: s.setBaudRate,
    })),
  )

  const isConnected = state === "connected"
  const isBusy = state === "connecting"

  return (
    <div className="flex items-center gap-3 border-b px-4 py-3">
      <Badge variant={STATE_VARIANT[state]}>{STATE_LABEL[state]}</Badge>
      <div className="flex items-center gap-2">
        <Label htmlFor="baud-rate" className="text-sm text-muted-foreground">
          ボーレート
        </Label>
        <Select
          value={String(baudRate)}
          onValueChange={(value) => {
            void setBaudRate(Number(value))
          }}
          disabled={isBusy}
        >
          <SelectTrigger id="baud-rate" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_BAUD_RATES.map((rate) => (
              <SelectItem key={rate} value={String(rate)}>
                {rate} bps
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isConnected ? (
        <Button variant="secondary" onClick={() => void disconnect()} disabled={isBusy}>
          切断
        </Button>
      ) : (
        <Button
          onClick={() => void connect()}
          disabled={isBusy || !isSupported}
          title={!isSupported ? "Web Serial API 非対応のブラウザです" : undefined}
        >
          接続
        </Button>
      )}
      {!isSupported && <span className="text-sm text-destructive">Web Serial API 非対応のブラウザです</span>}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  )
}
