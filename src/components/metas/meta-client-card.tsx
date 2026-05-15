"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/formatting";
import type { ClientTag } from "@prisma/client";

const TAG_COLORS: Record<ClientTag, string> = {
  MARMITARIA: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  DELIVERY: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  GENERICA: "bg-neutral-500/10 text-neutral-400 border-neutral-500/30",
};

interface WeekGoal {
  week: 1 | 2 | 3 | 4 | 5;
  goal: number;
  traffic?: number;
}

interface MonthlyGoal {
  id: string;
  clientId: string;
  year: number;
  month: number;
  weeks: WeekGoal[];
}

// API response may include client field
export interface MonthlyGoalApiResponse {
  id: string;
  clientId: string;
  year: number;
  month: number;
  weeks: unknown;
  client?: { id: string; name: string; tag: ClientTag };
}

interface ClientSummary {
  id: string;
  name: string;
  tag: ClientTag;
}

interface MetaClientCardProps {
  client: ClientSummary;
  goal: MonthlyGoal | null;
  year: number;
  month: number;
  canEdit: boolean;
  onGoalSaved?: (goal: MonthlyGoalApiResponse) => void;
}

const WEEKS = [1, 2, 3, 4, 5] as const;

function getMotivational(percent: number): string {
  if (percent >= 100) return "Meta atingida! 🎯";
  if (percent >= 75) return "Quase lá, continue!";
  if (percent >= 50) return "Na metade do caminho";
  return "Vamos acelerar!";
}

function WeeklyChart({ weeks }: { weeks: WeekGoal[] }) {
  const maxVal = Math.max(
    ...weeks.flatMap((w) => [w.goal, w.traffic ?? 0]),
    1
  );

  const barWidth = 30;
  const gap = 12;
  const totalWidth = WEEKS.length * (barWidth + gap) - gap;
  const chartHeight = 60;

  return (
    <svg
      width={totalWidth}
      height={chartHeight + 10}
      viewBox={`0 0 ${totalWidth} ${chartHeight + 10}`}
      className="overflow-visible"
    >
      {weeks.map((w, i) => {
        const x = i * (barWidth + gap);
        const goalH = Math.max(2, (w.goal / maxVal) * chartHeight);
        const trafficH = Math.max(2, ((w.traffic ?? 0) / maxVal) * chartHeight);
        const goalY = chartHeight - goalH;
        const trafficY = chartHeight - trafficH;

        return (
          <g key={w.week}>
            {/* Goal bar */}
            <rect
              x={x}
              y={goalY}
              width={barWidth / 2 - 1}
              height={goalH}
              rx={2}
              className="fill-green-500/40"
            />
            {/* Traffic bar */}
            {(w.traffic ?? 0) > 0 && (
              <rect
                x={x + barWidth / 2 + 1}
                y={trafficY}
                width={barWidth / 2 - 1}
                height={trafficH}
                rx={2}
                className="fill-orange-500/70"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function MetaClientCard({
  client,
  goal,
  year,
  month,
  canEdit,
  onGoalSaved,
}: MetaClientCardProps) {
  const defaultWeeks: WeekGoal[] = WEEKS.map((w) => ({
    week: w,
    goal: 0,
    traffic: 0,
  }));

  const [weeks, setWeeks] = useState<WeekGoal[]>(
    goal ? (goal.weeks.length > 0 ? goal.weeks : defaultWeeks) : defaultWeeks
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalGoal = weeks.reduce((s, w) => s + (w.goal || 0), 0);
  const totalTraffic = weeks.reduce((s, w) => s + (w.traffic || 0), 0);
  const pct = totalGoal > 0 ? Math.round((totalTraffic / totalGoal) * 100) : 0;

  function updateGoal(weekNum: number, value: number) {
    setWeeks((prev) =>
      prev.map((w) => (w.week === weekNum ? { ...w, goal: value } : w))
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (goal) {
        const res = await fetch(`/api/goals/${goal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weeks }),
        });
        if (!res.ok) throw new Error("Erro ao salvar");
        const updated = await res.json() as MonthlyGoalApiResponse;
        onGoalSaved?.(updated);
      } else {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: client.id, year, month, weeks }),
        });
        if (!res.ok) throw new Error("Erro ao criar meta");
        const created = await res.json() as MonthlyGoalApiResponse;
        onGoalSaved?.(created);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  const motivational = getMotivational(pct);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-white text-sm truncate flex-1">
          {client.name}
        </span>
        <span
          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-semibold ${TAG_COLORS[client.tag]}`}
        >
          {client.tag}
        </span>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-5 gap-2">
        {WEEKS.map((w) => {
          const weekData = weeks.find((wk) => wk.week === w) ?? {
            week: w,
            goal: 0,
            traffic: 0,
          };
          return (
            <div key={w} className="space-y-1">
              <p className="text-xs text-neutral-500 text-center">Sem {w}</p>
              {canEdit ? (
                <Input
                  type="number"
                  min={0}
                  value={weekData.goal || ""}
                  onChange={(e) => updateGoal(w, parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs text-center px-1 bg-neutral-800 border-neutral-700 text-white"
                  placeholder="0"
                />
              ) : (
                <div className="h-7 flex items-center justify-center text-xs text-white bg-neutral-800 rounded border border-neutral-700">
                  {weekData.goal > 0 ? formatBRL(weekData.goal) : "—"}
                </div>
              )}
              <div className="h-5 flex items-center justify-center text-xs text-orange-400">
                {(weekData.traffic ?? 0) > 0
                  ? formatBRL(weekData.traffic!)
                  : <span className="text-neutral-700">—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="flex justify-center pt-1">
        <WeeklyChart weeks={weeks} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-green-500/40 inline-block" />
          Meta
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-orange-500/70 inline-block" />
          Tráfego
        </span>
      </div>

      {/* Progress + motivational */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-400">{motivational}</span>
          <span className="text-neutral-400">{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span>Total meta: {totalGoal > 0 ? formatBRL(totalGoal) : "—"}</span>
          <span>Realizado: {totalTraffic > 0 ? formatBRL(totalTraffic) : "—"}</span>
        </div>
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 text-xs h-7"
          >
            {saving ? "Salvando..." : goal ? "Salvar" : "+ Criar Meta"}
          </Button>
          {error && (
            <span className="text-xs text-red-400">{error}</span>
          )}
        </div>
      )}
    </div>
  );
}
