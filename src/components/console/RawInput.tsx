import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { attachChecksum } from "@/lib/checksum";

interface RawInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (sentence: string) => void;
  disabled?: boolean;
}

export function RawInput({ value, onChange, onSend, disabled }: RawInputProps) {
  const preview = useMemo(() => buildPreview(value), [value]);
  const canSend = !disabled && preview !== null;
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="raw-input">PAIR コマンド (本文のみ。チェックサムは自動付与)</Label>
        <Input
          id="raw-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="PAIR050,3000"
          disabled={disabled ?? false}
        />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-sm text-muted-foreground">送信プレビュー</Label>
        <code className="rounded-md border bg-muted px-3 py-2 font-mono text-sm">
          {preview ?? "(コマンドを入力)"}
        </code>
      </div>
      <Button
        onClick={() => {
          if (preview) onSend(preview);
        }}
        disabled={!canSend}
        className="w-fit"
      >
        送信
      </Button>
    </div>
  );
}

function buildPreview(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const body = trimmed.startsWith("$") ? trimmed.slice(1) : trimmed;
  const star = body.indexOf("*");
  const cleanBody = star >= 0 ? body.slice(0, star) : body;
  if (cleanBody.length === 0) return null;
  return attachChecksum(cleanBody);
}
