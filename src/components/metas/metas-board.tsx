"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Metas Mensais</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Gerencie as metas semanais por cliente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="border-neutral-700 text-neutral-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-white min-w-[140px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(1)}
            className="border-neutral-700 text-neutral-400 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 h-48 animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
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
  );
}
