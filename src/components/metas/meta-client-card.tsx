"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/formatting";
import type { ClientTag } from "@prisma/client";

const TAG_STYLES: Record<ClientTag, { background: string; color: string; border: string }> = {
  MARMITARIA: { background: "rgba(232,167,58,0.12)", color: "#e8a73a", border: "rgba(232,167,58,0.25)" },
  DELIVERY: { background: "rgba(91,138,212,0.12)", color: "#5b8ad4", border: "rgba(91,138,212,0.25)" },
  GENERICA: { background: "rgba(110,122,112,0.12)", color: "#a8b3aa", border: "rgba(110,122,112,0.25)" },
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

function getMotivational(percent: number): { text: string; color: string } {
  if (percent >= 100) return { text: "Meta atingida! 🎯", color: "#7DC128" };
  if (percent >= 75) return { text: "Quase lá, continue!", color: "#9be03a" };
  if (percent >= 50) return { text: "Na metade do caminho", color: "#e8a73a" };
  return { text: "Vamos acelerar!", color: "#d85a4a" };
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
              fill="rgba(125,193,40,0.35)"
            />
            {/* Traffic bar */}
            {(w.traffic ?? 0) > 0 && (
              <rect
                x={x + barWidth / 2 + 1}
                y={trafficY}
                width={barWidth / 2 - 1}
                height={trafficH}
                rx={2}
                fill="rgba(232,167,58,0.7)"
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
  const tagStyle = TAG_STYLES[client.tag];

  return (
    <div
      style={{
        background: "#141f18",
        border: "1px solid #1f2a23",
        borderRadius: 10,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        {/* Initials avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, #244a32, #15301f)",
            border: "1px solid #284d36",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#9be03a", fontWeight: 700, fontSize: 13 }}>
            {client.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <span
          style={{
            fontWeight: 700,
            color: "#e6efe8",
            fontSize: 14,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {client.name}
        </span>
        <span
          style={{
            background: tagStyle.background,
            color: tagStyle.color,
            border: `1px solid ${tagStyle.border}`,
            borderRadius: 5,
            padding: "2px 7px",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {client.tag}
        </span>
      </div>

      {/* Week grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
        {WEEKS.map((w) => {
          const weekData = weeks.find((wk) => wk.week === w) ?? {
            week: w,
            goal: 0,
            traffic: 0,
          };
          return (
            <div key={w} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#6e7a70",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                Sem {w}
              </p>
              {canEdit ? (
                <input
                  type="number"
                  min={0}
                  value={weekData.goal || ""}
                  onChange={(e) => updateGoal(w, parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  style={{
                    height: 28,
                    fontSize: 11,
                    textAlign: "center",
                    padding: "0 4px",
                    background: "#182219",
                    border: "1px solid #1f2a23",
                    borderRadius: 6,
                    color: "#e6efe8",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <div
                  style={{
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: "#e6efe8",
                    background: "#182219",
                    borderRadius: 6,
                    border: "1px solid #1f2a23",
                  }}
                >
                  {weekData.goal > 0 ? formatBRL(weekData.goal) : "—"}
                </div>
              )}
              <div
                style={{
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: (weekData.traffic ?? 0) > 0 ? "#e8a73a" : "#4a5450",
                }}
              >
                {(weekData.traffic ?? 0) > 0
                  ? formatBRL(weekData.traffic!)
                  : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
        <WeeklyChart weeks={weeks} />
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: "#6e7a70" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: "rgba(125,193,40,0.5)",
              display: "inline-block",
            }}
          />
          Meta
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: "rgba(232,167,58,0.7)",
              display: "inline-block",
            }}
          />
          Tráfego
        </span>
      </div>

      {/* Progress + motivational */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: motivational.color, fontWeight: 600 }}>{motivational.text}</span>
          <span style={{ color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
            {pct}%
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 4,
            background: "#182219",
            borderRadius: 9999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: pct >= 100 ? "#7DC128" : pct >= 50 ? "#e8a73a" : "#d85a4a",
              borderRadius: 9999,
              width: `${Math.min(pct, 100)}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#4a5450",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>Meta: {totalGoal > 0 ? formatBRL(totalGoal) : "—"}</span>
          <span>Realizado: {totalTraffic > 0 ? formatBRL(totalTraffic) : "—"}</span>
        </div>
      </div>

      {/* Actions */}
      {canEdit && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              background: saving ? "#4a5a30" : "#7DC128",
              color: "#0a1408",
              fontSize: 12,
              fontWeight: 700,
              padding: "7px 12px",
              borderRadius: 8,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {saving ? "Salvando..." : goal ? "Salvar" : "+ Criar Meta"}
          </button>
          {error && (
            <span style={{ fontSize: 11, color: "#d85a4a" }}>{error}</span>
          )}
        </div>
      )}
    </div>
  );
}
