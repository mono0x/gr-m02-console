import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ConnectionBar } from "./ConnectionBar";

interface AppShellProps {
  status: ReactNode;
  settings: ReactNode;
  console: ReactNode;
  log: ReactNode;
}

export function AppShell({ status, settings, console: pairConsole, log }: AppShellProps) {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-base font-semibold">GR-M02U Console</h1>
        </header>
        <ConnectionBar />
        <Tabs defaultValue="status" className="flex-1">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="console">PAIR Console</TabsTrigger>
            <TabsTrigger value="log">Raw Log</TabsTrigger>
          </TabsList>
          <TabsContent value="status" className="px-4 py-4">
            {status}
          </TabsContent>
          <TabsContent value="settings" className="px-4 py-4">
            {settings}
          </TabsContent>
          <TabsContent value="console" className="px-4 py-4">
            {pairConsole}
          </TabsContent>
          <TabsContent value="log" className="px-4 py-4">
            {log}
          </TabsContent>
        </Tabs>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
