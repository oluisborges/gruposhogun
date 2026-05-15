"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const isFirst = rank === 0;
  const heights = [120, 88, 64];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        order: rank === 0 ? 2 : rank === 1 ? 1 : 3,
      }}
    >
      <span style={{ fontSize: 28 }}>{PODIUM_CROWNS[rank]}</span>
      <div
        style={{
          width: 80,
          height: heights[rank],
          background: "#141f18",
          border: isFirst ? "1px solid #7DC128" : "1px solid #1f2a23",
          borderRadius: "8px 8px 0 0",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 10,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#e6efe8",
              maxWidth: 68,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {entry.userName}
          </p>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: isFirst ? 20 : 16,
              fontWeight: 700,
              color: isFirst ? "#7DC128" : "#a8b3aa",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {entry.totalPoints}
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#6e7a70" }}>pts</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function MedalCell({ medal }: { medal?: Medal }) {
  if (!medal) return <span style={{ color: "#4a5450" }}>—</span>;
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
          <span style={{ color: "#e6efe8", fontWeight: 600 }}>Ranking de Gestores</span>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[192, 240].map((h, i) => (
              <div
                key={i}
                style={{
                  background: "#141f18",
                  border: "1px solid #1f2a23",
                  borderRadius: 10,
                  height: h,
                  animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Podium */}
            {top3.length > 0 && (
              <div
                style={{
                  background: "#141f18",
                  border: "1px solid #1f2a23",
                  borderRadius: 10,
                  padding: 24,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#6e7a70",
                    fontWeight: 700,
                    textAlign: "center",
                    marginBottom: 20,
                  }}
                >
                  Top 3
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "flex-end",
                    gap: 16,
                  }}
                >
                  {top3.map((entry, i) => (
                    <PodiumCard key={entry.userId} entry={entry} rank={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Full table */}
            {entries.length === 0 ? (
              <div
                style={{
                  background: "#141f18",
                  border: "1px solid #1f2a23",
                  borderRadius: 10,
                  padding: 32,
                  textAlign: "center",
                  color: "#4a5450",
                  fontSize: 14,
                }}
              >
                Nenhum dado de ranking para {MONTH_NAMES[month - 1]} {year}
              </div>
            ) : (
              <div
                style={{
                  background: "#141f18",
                  border: "1px solid #1f2a23",
                  borderRadius: 10,
                  overflow: "auto",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["#", "Gestor", "ROAS", "CPA", "Receita", "Ticket Médio", "Conv. Rate", "CPM", "Pontos"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: h === "#" || h === "Gestor" ? "left" : "right",
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "#6e7a70",
                            fontWeight: 700,
                            padding: "10px 16px",
                            borderBottom: "1px solid #1f2a23",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, i) => (
                      <tr
                        key={entry.userId}
                        style={{
                          borderBottom: i === entries.length - 1 ? "none" : "1px dashed #1f2a23",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#182219")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "#6e7a70",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {i + 1}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#e6efe8",
                          }}
                        >
                          {entry.userName}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <span style={{ fontSize: 13, color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                            <MedalCell medal={entry.medals.roas} />{" "}{formatNumber(entry.metrics.roas)}x
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <span style={{ fontSize: 13, color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                            <MedalCell medal={entry.medals.cpa} />{" "}{entry.metrics.cpa > 0 ? formatBRL(entry.metrics.cpa) : "—"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <span style={{ fontSize: 13, color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                            <MedalCell medal={entry.medals.revenue} />{" "}{formatBRL(entry.metrics.revenue)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <span style={{ fontSize: 13, color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                            <MedalCell medal={entry.medals.avgTicket} />{" "}{entry.metrics.avgTicket > 0 ? formatBRL(entry.metrics.avgTicket) : "—"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <span style={{ fontSize: 13, color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                            <MedalCell medal={entry.medals.conversionRate} />{" "}{formatPercent(entry.metrics.conversionRate)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <span style={{ fontSize: 13, color: "#a8b3aa", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                            <MedalCell medal={entry.medals.cpm} />{" "}{formatBRL(entry.metrics.cpm)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <span
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: 16,
                              fontWeight: 700,
                              color: "#7DC128",
                              textTransform: "uppercase",
                              letterSpacing: "0.02em",
                            }}
                          >
                            {entry.totalPoints}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
