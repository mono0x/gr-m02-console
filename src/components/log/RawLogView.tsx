import { useVirtualizer } from "@tanstack/react-virtual"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useLogStore } from "@/store/log-store"

const ROW_HEIGHT = 22

export function RawLogView() {
  const lines = useLogStore((s) => s.lines)
  const paused = useLogStore((s) => s.paused)
  const setPaused = useLogStore((s) => s.setPaused)
  const clear = useLogStore((s) => s.clear)
  const capacity = useLogStore((s) => s.capacity)

  const parentRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState("")
  const [autoScroll, setAutoScroll] = useState(true)

  const filtered = filter
    ? lines.filter((line) => line.text.toLowerCase().includes(filter.toLowerCase()))
    : lines

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  })

  useEffect(() => {
    if (!autoScroll) return
    if (filtered.length === 0) return
    virtualizer.scrollToIndex(filtered.length - 1, { align: "end" })
  }, [filtered.length, autoScroll, virtualizer])

  const items = virtualizer.getVirtualItems()

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant={paused ? "default" : "outline"} onClick={() => setPaused(!paused)}>
          {paused ? "再開" : "一時停止"}
        </Button>
        <Button variant="outline" onClick={() => clear()}>
          クリア
        </Button>
        <div className="flex items-center gap-2">
          <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
          <Label htmlFor="auto-scroll" className="text-sm">
            自動スクロール
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="filter" className="text-sm text-muted-foreground">
            フィルタ
          </Label>
          <Input
            id="filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="GGA, PAIR …"
            className="h-8 w-48"
          />
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} / {lines.length} (上限 {capacity})
        </span>
      </div>
      <div ref={parentRef} className="flex-1 overflow-auto rounded-md border bg-card font-mono text-xs">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
          {items.map((item) => {
            const line = filtered[item.index]
            if (!line) return null
            return (
              <div
                key={line.seq}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 right-0 flex gap-2 whitespace-pre px-3 leading-[22px]"
                style={{ transform: `translateY(${item.start}px)` }}
              >
                <span className="text-muted-foreground tabular-nums">{formatTs(line.ts)}</span>
                <span className={line.dir === "tx" ? "text-blue-600 dark:text-blue-400" : "text-foreground"}>
                  {line.dir === "tx" ? "→" : "←"}
                </span>
                <span className="flex-1">{line.text}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function formatTs(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  const ms = String(d.getMilliseconds()).padStart(3, "0")
  return `${hh}:${mm}:${ss}.${ms}`
}
