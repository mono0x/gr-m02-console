import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { startPipeline } from "@/store/pipeline";
import { PairConsoleView } from "@/views/PairConsoleView";
import { RawLogView } from "@/views/RawLogView";
import { SettingsView } from "@/views/SettingsView";
import { StatusView } from "@/views/StatusView";

export function App() {
  useEffect(() => {
    startPipeline();
  }, []);

  return (
    <AppShell
      status={<StatusView />}
      settings={<SettingsView />}
      console={<PairConsoleView />}
      log={<RawLogView />}
    />
  );
}
