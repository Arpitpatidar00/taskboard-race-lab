import { useState, useEffect } from "react";
import type { UnreliableConfig } from "@/features/tasks/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Beaker, ChevronDown, ChevronUp } from "lucide-react";

export function RaceLabPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<UnreliableConfig>({
    enabled: true,
    minLatency: 100,
    maxLatency: 1800,
    errorRate: 0.10,
    duplicateRate: 0.05,
  });

  // Load current config on mount
  useEffect(() => {
    fetch("/api/tasks/config/unreliable")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(() => {/* ignore on load failure */});
  }, []);

  const updateConfig = (update: Partial<UnreliableConfig>) => {
    const newConfig = { ...config, ...update };
    setConfig(newConfig);
    fetch("/api/tasks/config/unreliable", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }).catch(() => {/* ignore */});
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-w-xs">
        {/* Toggle button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Beaker className="size-4 text-indigo-500" />
          <span>API Simulation</span>
          <span className={`ml-auto size-2 rounded-full ${config.enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
          {isOpen ? (
            <ChevronDown className="size-4 text-slate-400" />
          ) : (
            <ChevronUp className="size-4 text-slate-400" />
          )}
        </button>

        {/* Panel content */}
        {isOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
            {/* Enable/disable toggle */}
            <div className="flex items-center justify-between pt-3">
              <Label className="text-xs">Enabled</Label>
              <button
                onClick={() => updateConfig({ enabled: !config.enabled })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  config.enabled ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    config.enabled ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Latency range */}
            <div className="space-y-1.5">
              <Label className="text-xs">Latency Range (ms)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={config.minLatency}
                  onChange={(e) => updateConfig({ minLatency: parseInt(e.target.value) || 0 })}
                  className="h-7 text-xs w-20"
                />
                <span className="text-xs text-slate-400">—</span>
                <Input
                  type="number"
                  value={config.maxLatency}
                  onChange={(e) => updateConfig({ maxLatency: parseInt(e.target.value) || 0 })}
                  className="h-7 text-xs w-20"
                />
              </div>
            </div>

            {/* Error rate */}
            <div className="space-y-1.5">
              <Label className="text-xs">Error Rate ({Math.round(config.errorRate * 100)}%)</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={config.errorRate * 100}
                onChange={(e) => updateConfig({ errorRate: parseInt(e.target.value) / 100 })}
                className="w-full accent-indigo-600 h-1.5"
              />
            </div>

            {/* Duplicate rate */}
            <div className="space-y-1.5">
              <Label className="text-xs">Duplicate Rate ({Math.round(config.duplicateRate * 100)}%)</Label>
              <input
                type="range"
                min={0}
                max={50}
                value={config.duplicateRate * 100}
                onChange={(e) => updateConfig({ duplicateRate: parseInt(e.target.value) / 100 })}
                className="w-full accent-indigo-600 h-1.5"
              />
            </div>

            {/* Preset buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex-1"
                onClick={() => updateConfig({ enabled: false })}
              >
                Stable
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex-1"
                onClick={() =>
                  updateConfig({
                    enabled: true,
                    minLatency: 100,
                    maxLatency: 1800,
                    errorRate: 0.1,
                    duplicateRate: 0.05,
                  })
                }
              >
                Default
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex-1"
                onClick={() =>
                  updateConfig({
                    enabled: true,
                    minLatency: 500,
                    maxLatency: 3000,
                    errorRate: 0.3,
                    duplicateRate: 0.15,
                  })
                }
              >
                Chaos
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
