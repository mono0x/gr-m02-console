import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buildPairSentence } from "@/pair/encode"
import { PAIR_CATALOG, PAIR_COMMANDS } from "@/pair/catalog"
import { sendPairCommand } from "@/pair/runtime"
import { PairError } from "@/pair/types"
import { useConnectionStore } from "@/store/connection-store"
import { CommandArgsForm, defaultArgValues } from "./CommandArgsForm"
import { CommandPicker } from "./CommandPicker"
import { HistoryList } from "./HistoryList"
import { RawInput } from "./RawInput"

export function PairConsoleView() {
  const isConnected = useConnectionStore((s) => s.state === "connected")
  const initialCid = PAIR_COMMANDS[0]?.cid ?? "005"
  const [cid, setCid] = useState<string>(initialCid)
  const [values, setValues] = useState<string[]>(() =>
    PAIR_CATALOG[initialCid] ? defaultArgValues(PAIR_CATALOG[initialCid]) : [],
  )
  const [rawInput, setRawInput] = useState<string>("")

  const spec = PAIR_CATALOG[cid]
  const preview = useMemo(() => (spec ? buildPairSentence(spec.cid, values) : ""), [spec, values])

  function selectCommand(next: string) {
    setCid(next)
    const nextSpec = PAIR_CATALOG[next]
    setValues(nextSpec ? defaultArgValues(nextSpec) : [])
  }

  async function runFormSend() {
    if (!spec) return
    if (spec.destructive) {
      const ok = window.confirm(`${spec.cid} ${spec.name} は副作用のあるコマンドです。実行しますか?`)
      if (!ok) return
    }
    try {
      const response = await sendPairCommand({ cid: spec.cid, args: values })
      toast.success(`PAIR${spec.cid} 成功 (${response.durationMs} ms)`)
      if (spec.cid === "864") {
        toast.warning("ボーレートを変更しました", {
          description: "デバイスは新ボーレートで応答するため、上部から手動で再接続してください。",
        })
      }
    } catch (err) {
      const message = err instanceof PairError ? `${err.kind}: ${err.message}` : String(err)
      toast.error(`PAIR${spec.cid} 失敗`, { description: message })
    }
  }

  async function runRawSend(sentence: string) {
    const cidMatch = /^\$PAIR(\d+)/.exec(sentence)
    if (!cidMatch || !cidMatch[1]) {
      toast.error("PAIR コマンドの形式ではありません")
      return
    }
    const enteredCid = cidMatch[1].padStart(3, "0")
    const body = sentence.slice(1, sentence.lastIndexOf("*"))
    const args = body.split(",").slice(1)
    try {
      const catalogEntry = PAIR_CATALOG[enteredCid]
      const response = await sendPairCommand({
        cid: enteredCid,
        args,
        ...(catalogEntry?.followUpCid ? { expectFollowUpCid: catalogEntry.followUpCid } : {}),
      })
      toast.success(`PAIR${enteredCid} 成功 (${response.durationMs} ms)`)
    } catch (err) {
      const message = err instanceof PairError ? `${err.kind}: ${err.message}` : String(err)
      toast.error(`PAIR${enteredCid} 失敗`, { description: message })
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>PAIR コマンド</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="form">
            <TabsList>
              <TabsTrigger value="form">フォーム</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>
            <TabsContent value="form" className="space-y-4 pt-3">
              <CommandPicker value={cid} onChange={selectCommand} />
              {spec ? (
                <>
                  <p className="text-sm text-muted-foreground">{spec.description}</p>
                  <CommandArgsForm spec={spec} values={values} onChange={setValues} disabled={!isConnected} />
                  <div className="grid gap-1.5">
                    <span className="text-sm text-muted-foreground">送信プレビュー</span>
                    <code className="rounded-md border bg-muted px-3 py-2 font-mono text-sm">{preview}</code>
                  </div>
                  <Button onClick={() => void runFormSend()} disabled={!isConnected} className="w-fit">
                    送信
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">コマンドを選択してください</p>
              )}
            </TabsContent>
            <TabsContent value="raw" className="pt-3">
              <RawInput value={rawInput} onChange={setRawInput} onSend={runRawSend} disabled={!isConnected} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <HistoryList />
    </div>
  )
}
