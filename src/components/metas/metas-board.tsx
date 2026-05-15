"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MetaClientCard } from "@/components/metas/meta-client-card";
import type { MonthlyGoalApiResponse } from "@/components/metas/meta-client-card";
import type { ClientTag, Role } from "@prisma/client";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface WeekGoal {
  week: 1 | 2 | 3 | 4 | 5;
  goal: number;
  traffic?: number;
}

// Internal type with parsed weeks (client optional since we look up by clientId)
interface MonthlyGoal {
  id: string;
  clientId: string;
  year: number;
  month: number;
  weeks: WeekGoal[];
}

function parseGoal(g: MonthlyGoalApiResponse): MonthlyGoal {
  const weeks = Array.isArray(g.weeks) ? (g.weeks as WeekGoal[]) : [];
  return { id: g.id, clientId: g.clientId, year: g.year, month: g.month, weeks };
}

interface ClientSummary {
  id: string;
  name: string;
  tag: ClientTag;
}

interface UserSummary {
  id: string;
  role: Role;
}

interface MetasBoardProps {
  clients: ClientSummary[];
  goals: MonthlyGoalApiResponse[];
  currentUser: UserSummary;
  defaultYear: number;
  defaultMonth: number;
}

export function MetasBoard({
  clients,
  goals: initialGoals,
  currentUser,
  defaultYear,
  defaultMonth,
}: MetasBoardProps) {
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [goals, setGoals] = useState<MonthlyGoal[]>(initialGoals.map(parseGoal));
  const [loading, setLoading] = useState(false);

  const canEdit = currentUser.role === "OWNER" || currentUser.role === "COORDINATOR";

  const navigate = useCallback(
    async (dir: -1 | 1) => {
      let newMonth = month + dir;
      let newYear = year;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      if (newMonth < 1) { newMonth = 12; newYear--; }
      setMonth(newMonth);
      setYear(newYear);
      setLoading(true);
      try {
        const url = `/api/goals?year=${newYear}&month=${newMonth}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json() as MonthlyGoalApiResponse[];
          setGoals(data.map(parseGoal));
        }
      } finally {
        setLoading(false);
      }
    },
    [month, year]
  );

  function handleGoalSaved(raw: MonthlyGoalApiResponse) {
    const updated = parseGoal(raw);
    setGoals((prev) => {
      const idx = prev.findIndex((g) => g.clientId === updated.clientId && g.year === updated.year && g.month === updated.month);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  }

  const goalMap = new Map(goals.filter(g => g.year === year && g.month === month).map((g) => [g.clientId, g]));

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", background: "#0d1410" }}>
      {/* Topbar */}
      <div
        className="flex-shrink-0 flex items-center gap-5 px-7 sticky top-0 z-10"
        style={{
          height: 64,
          borderBottom: "1px solid #1f2a23",
          background: "rgba(13,20,16,0.85)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: "#6e7a70" }}>Operação</span>
          <span style={{ color: "#4a5450" }}>/</span>
          <span style={{ color: "#e6efe8", fontWeight: 600 }}>Metas Mensais</span>
        </div>

        {/* Month navigator */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "#0f1813",
              border: "1px solid #1f2a23",
              borderRadius: 8,
              color: "#a8b3aa",
              padding: "6px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              fontWeight: 700,
              color: "#e6efe8",
              minWidth: 150,
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={() => navigate(1)}
            style={{
              background: "#0f1813",
              border: "1px solid #1f2a23",
              borderRadius: 8,
              color: "#a8b3aa",
              padding: "6px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "28px 28px", flex: 1 }}>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "#141f18",
                  border: "1px solid #1f2a23",
                  borderRadius: 10,
                  height: 192,
                  animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                }}
              />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ height: 200, color: "#4a5450", fontSize: 14 }}
          >
            Nenhum cliente encontrado
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((client) => {
              const goal = goalMap.get(client.id) ?? null;
              return (
                <MetaClientCard
                  key={client.id}
                  client={client}
                  goal={goal}
                  year={year}
                  month={month}
                  canEdit={canEdit}
                  onGoalSaved={handleGoalSaved}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
