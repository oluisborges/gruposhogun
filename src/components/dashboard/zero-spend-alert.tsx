"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ZeroSpendAlertData {
  clientId: string;
  clientName: string;
  accountId: string;
  accountName: string;
}

export function ZeroSpendAlert() {
  const [alerts, setAlerts] = useState<ZeroSpendAlertData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/zero-spend")
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ alerts: ZeroSpendAlertData[]; cachedAt: string }>;
      })
      .then((data) => {
        if (data) setAlerts(data.alerts);
      })
      .catch(() => {
        // silently ignore errors
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 animate-pulse">
        <div className="h-4 w-48 bg-neutral-800 rounded" />
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <h3 className="text-sm font-semibold text-red-400">
          ⚠ {alerts.length} conta{alerts.length > 1 ? "s" : ""} sem gasto hoje
        </h3>
      </div>
      <ul className="space-y-1">
        {alerts.map((alert) => (
          <li
            key={`${alert.clientId}-${alert.accountId}`}
            className="flex items-center gap-2 text-sm text-red-300"
          >
            <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
            <span className="font-medium">{alert.clientName}</span>
            <span className="text-red-400/60 text-xs">({alert.accountName})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
