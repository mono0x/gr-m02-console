import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePairStore } from "@/store/pair-store"

const ACK_LABEL: Record<number, string> = {
  0: "成功",
  1: "処理中",
  2: "失敗",
  3: "非対応",
  4: "パラメータエラー",
  5: "ビジー",
}

export function HistoryList() {
  const history = usePairStore((s) => s.history)
  const clear = usePairStore((s) => s.clearHistory)

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">履歴</CardTitle>
        <Button variant="outline" size="sm" onClick={() => clear()} disabled={history.length === 0}>
          クリア
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[60vh]">
          <ul className="space-y-3 pr-3">
            {history.length === 0 && (
              <li className="text-sm text-muted-foreground">送信履歴はまだありません</li>
            )}
            {history.map((item) => {
              const status = item.error
                ? { label: item.error.kind, variant: "destructive" as const }
                : item.ack
                  ? {
                      label: ACK_LABEL[item.ack.result] ?? `result ${item.ack.result}`,
                      variant: item.ack.result === 0 ? ("default" as const) : ("secondary" as const),
                    }
                  : { label: "送信中…", variant: "outline" as const }
              return (
                <li key={item.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium">
                      {item.cid} {item.name ? `· ${item.name}` : ""}
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <code className="mt-1 block break-all font-mono text-xs">{item.rawSent}</code>
                  {item.followUp && (
                    <code className="mt-1 block break-all font-mono text-xs text-muted-foreground">
                      → {item.followUp.raw}
                    </code>
                  )}
                  {item.error && <p className="mt-1 text-xs text-destructive">{item.error.message}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.sentAt).toLocaleTimeString()}{" "}
                    {item.durationMs !== undefined && `· ${item.durationMs} ms`}
                  </p>
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
