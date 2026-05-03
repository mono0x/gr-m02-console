import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PAIR_COMMANDS } from "@/pair/catalog"
import type { PairCategory } from "@/pair/types"

interface CommandPickerProps {
  value: string
  onChange: (cid: string) => void
}

const ORDER: PairCategory[] = ["Restart", "Position", "NMEA", "GNSS", "DGPS", "Storage", "Port"]

export function CommandPicker({ value, onChange }: CommandPickerProps) {
  const grouped: Partial<Record<PairCategory, typeof PAIR_COMMANDS>> = {}
  for (const cmd of PAIR_COMMANDS) {
    const list = grouped[cmd.category] ?? []
    list.push(cmd)
    grouped[cmd.category] = list
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="コマンドを選択" />
      </SelectTrigger>
      <SelectContent>
        {ORDER.map((cat) => {
          const list = grouped[cat]
          if (!list || list.length === 0) return null
          return (
            <SelectGroup key={cat}>
              <SelectLabel>{cat}</SelectLabel>
              {list.map((cmd) => (
                <SelectItem key={cmd.cid} value={cmd.cid}>
                  {cmd.cid} — {cmd.name}
                </SelectItem>
              ))}
            </SelectGroup>
          )
        })}
      </SelectContent>
    </Select>
  )
}
