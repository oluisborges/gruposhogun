"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL, formatNumber, formatPercent } from "@/lib/formatting";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Medal = "gold" | "silver" | "bronze";

interface RankingMetrics {
  roas: number;
  cpa: number;
  revenue: number;
  avgTicket: number;
  conversionRate: number;
  cpm: number;
}

interface RankingMedals {
  roas?: Medal;
  cpa?: Medal;
  revenue?: Medal;
  avgTicket?: Medal;
  conversionRate?: Medal;
  cpm?: Medal;
}

interface RankingEntry {
  userId: string;
  userName: string;
  metrics: RankingMetrics;
  medals: RankingMedals;
  totalPoints: number;
}

interface RankingData {
  managers: RankingEntry[];
  month: number;
  year: number;
}

interface RankingBoardProps {
  initialData: RankingData;
  initialMonth: number;
  initialYear: number;
}

const MEDAL_EMOJI: Record<Medal, string> = { gold: "🥇", silver: "🥈", bronze: "🥉" };
const PODIUM_CROWNS = ["🥇", "🥈", "🥉"];

function PodiumCard({ entry, rank }: { entry: RankingEntry; rank: number }) {
  const sizes = ["h-24", "h-16", "h-12"];
  const crowns = PODIUM_CROWNS;

  return (
    <div className={`flex flex-col items-center gap-2 ${rank === 0 ? "order-2" : rank === 1 ? "order-1" : "order-3"}`}>
      <span className="text-2xl">{crowns[rank]}</span>
      <div className={`w-20 bg-neutral-800 border border-neutral-700 rounded-t-lg flex items-end justify-center ${sizes[rank]}`}>
        <div className="pb-2 text-center">
          <p className="text-xs font-bold text-white truncate max-w-[70px]">{entry.userName}</p>
          <p className="text-xs text-neutral-400">{entry.totalPoints}pts</p>
        </div>
      </div>
    </div>
  );
}

function MedalCell({ medal }: { medal?: Medal }) {
  if (!medal) return <span className="text-neutral-700">—</span>;
  return <span>{MEDAL_EMOJI[medal]}</span>;
}

export function RankingBoard({ initialData, initialMonth, initialYear }: RankingBoardProps) {
  const [data, setData] = useState<RankingData>(initialData);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [loading, setLoading] = useState(false);

  const navigate = useCallback(async (dir: -1 | 1) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setMonth(newMonth);
    setYear(newYear);
    setLoading(true);
    try {
      const res = await fetch(`/api/ranking?year=${newYear}&month=${newMonth}`);
      if (res.ok) {
        const d = await res.json() as RankingData;
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  const top3 = data.managers.slice(0, 3);
  const entries = data.managers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Ranking de Gestores</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Performance dos gestores por métricas agregadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="border-neutral-700 text-neutral-400 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-white min-w-[140px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate(1)} className="border-neutral-700 text-neutral-400 hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-neutral-900 border border-neutral-800 rounded-lg" />
          <div className="h-48 bg-neutral-900 border border-neutral-800 rounded-lg" />
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <h2 className="text-sm font-semibold text-neutral-400 mb-4 text-center">Top 3</h2>
              <div className="flex justify-center items-end gap-4">
                {top3.map((entry, i) => (
                  <PodiumCard key={entry.userId} entry={entry} rank={i} />
                ))}
              </div>
            </div>
          )}

          {/* Full table */}
          {entries.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center text-neutral-500">
              Nenhum dado de ranking para {MONTH_NAMES[month - 1]} {year}
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">#</th>
                    <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Gestor</th>
                    <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">ROAS</th>
                    <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">CPA</th>
                    <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Receita</th>
                    <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Ticket Médio</th>
                    <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Conv. Rate</th>
                    <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">CPM</th>
                    <th className="text-right text-xs font-medium text-neutral-500 px-4 py-3">Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={entry.userId} className="border-b border-neutral-800 last:border-0 hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-neutral-500">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-white">{entry.userName}</td>
                      <td className="px-4 py-3 text-sm text-right text-neutral-300">
                        <MedalCell medal={entry.medals.roas} /> {formatNumber(entry.metrics.roas)}x
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-neutral-300">
                        <MedalCell medal={entry.medals.cpa} /> {entry.metrics.cpa > 0 ? formatBRL(entry.metrics.cpa) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-neutral-300">
                        <MedalCell medal={entry.medals.revenue} /> {formatBRL(entry.metrics.revenue)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-neutral-300">
                        <MedalCell medal={entry.medals.avgTicket} /> {entry.metrics.avgTicket > 0 ? formatBRL(entry.metrics.avgTicket) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-neutral-300">
                        <MedalCell medal={entry.medals.conversionRate} /> {formatPercent(entry.metrics.conversionRate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-neutral-300">
                        <MedalCell medal={entry.medals.cpm} /> {formatBRL(entry.metrics.cpm)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-white">
                        {entry.totalPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
