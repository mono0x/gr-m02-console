import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PairCommandSpec } from "@/pair/types";

export interface CommandArgsFormProps {
  spec: PairCommandSpec;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

export function CommandArgsForm({ spec, values, onChange, disabled }: CommandArgsFormProps) {
  if (spec.args.length === 0) {
    return <p className="text-sm text-muted-foreground">引数なし</p>;
  }

  function setValue(index: number, value: string) {
    const next = [...values];
    next[index] = value;
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      {spec.args.map((arg, idx) => {
        const value = values[idx] ?? "";
        const fieldId = `${spec.cid}-${arg.name}`;
        return (
          <Field key={fieldId} id={fieldId} label={arg.name} help={arg.help}>
            {renderField({
              id: fieldId,
              kind: arg.kind,
              value,
              onChange: (v) => setValue(idx, v),
              disabled: disabled ?? false,
            })}
          </Field>
        );
      })}
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  help: string | undefined;
  children: ReactNode;
}

function Field({ id, label, help, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      {children}
      {help && <span className="text-xs text-muted-foreground">{help}</span>}
    </div>
  );
}

interface RenderFieldArgs {
  id: string;
  kind: PairCommandSpec["args"][number]["kind"];
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}

function renderField({ id, kind, value, onChange, disabled }: RenderFieldArgs) {
  if (kind.type === "enum") {
    return (
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {kind.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (kind.type === "int" || kind.type === "float") {
    return (
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={kind.min}
        max={kind.max}
        step={kind.step ?? (kind.type === "int" ? 1 : 0.1)}
        disabled={disabled}
      />
    );
  }
  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={kind.type === "string" ? kind.placeholder : undefined}
      disabled={disabled}
    />
  );
}

export function defaultArgValues(spec: PairCommandSpec): string[] {
  return spec.args.map((arg) => {
    const k = arg.kind;
    if (k.type === "enum") return k.default ?? k.options[0]?.value ?? "";
    if (k.type === "int" || k.type === "float") return k.default !== undefined ? String(k.default) : "";
    return "";
  });
}
