import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/cn"

interface StatusCardProps {
  title: ReactNode
  titleClassName?: string
  contentClassName?: string
  children: ReactNode
}

export function StatusCard({ title, titleClassName, contentClassName, children }: StatusCardProps) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className={cn("text-sm", titleClassName)}>{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn("px-4", contentClassName)}>{children}</CardContent>
    </Card>
  )
}

export function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}
