"use client"

import { useState, useEffect, useCallback } from "react"
import { formatBRL, formatNumber } from "@/lib/formatting"
import { Save, Trash2, ChevronDown, ChevronRight } from "lucide-react"

interface CalcInputs {
  faturamentoTotal: string
  faturamentoTrafico: string
  metaFaturamento: string
  ticketMedio: string
  investimentoAnterior: string
}

interface CalcResult {
  inputs: CalcInputs
  percTrafico: number
  roasAtual: number
  pedidosNecessarios: number
  investimentoNecessario: number
  investimentoAdicional: number
  savedAt: string
}

const HISTORY_KEY = "shogun_calc_investimento_history"
const MAX_HISTORY = 5

const defaultInputs: CalcInputs = {
  faturamentoTotal: "",
  faturamentoTrafico: "",
  metaFaturamento: "",
  ticketMedio: "",
  investimentoAnterior: "",
}

function parseNum(val: string): number {
  const clean = val.replace(/[^\d,.-]/g, "").replace(",", ".")
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

function compute(inputs: CalcInputs) {
  const total = parseNum(inputs.faturamentoTotal)
  const trafico = parseNum(inputs.faturamentoTrafico)
  const meta = parseNum(inputs.metaFaturamento)
  const ticket = parseNum(inputs.ticketMedio)
  const invAnterior = parseNum(inputs.investimentoAnterior)

  const percTrafico = total > 0 ? (trafico / total) * 100 : 0
  const roasAtual = invAnterior > 0 ? trafico / invAnterior : 0
  const pedidosNecessarios = ticket > 0 ? meta / ticket : 0
  const investimentoNecessario = roasAtual > 0 ? meta / roasAtual : 0
  const investimentoAdicional = investimentoNecessario - invAnterior

  return { percTrafico, roasAtual, pedidosNecessarios, investimentoNecessario, investimentoAdicional }
}

export function InvestmentCalculator() {
  const [inputs, setInputs] = useState<CalcInputs>(defaultInputs)
  const [history, setHistory] = useState<CalcResult[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // Load history from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(HISTORY_KEY)
      if (stored) {
        setHistory(JSON.parse(stored) as CalcResult[])
      }
    } catch {
      // ignore
    }
  }, [])

  const results = compute(inputs)
  const hasInputs = Object.values(inputs).some((v) => v.trim() !== "")

  const handleChange = useCallback(
    (field: keyof CalcInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputs((prev) => ({ ...prev, [field]: e.target.value }))
    },
    []
  )

  const handleSave = useCallback(() => {
    const entry: CalcResult = {
      inputs,
      ...results,
      savedAt: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    }
    const updated = [entry, ...history].slice(0, MAX_HISTORY)
    setHistory(updated)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
      } catch {
        // ignore
      }
    }
  }, [inputs, results, history])

  const handleClearHistory = useCallback(() => {
    setHistory([])
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(HISTORY_KEY)
      } catch {
        // ignore
      }
    }
  }, [])

  const inputFields: { label: string; key: keyof CalcInputs; placeholder: string }[] = [
    { label: "Faturamento Total (R$)", key: "faturamentoTotal", placeholder: "Ex: 50000" },
    { label: "Faturamento via Tráfego Pago (R$)", key: "faturamentoTrafico", placeholder: "Ex: 30000" },
    { label: "Meta de Faturamento (R$)", key: "metaFaturamento", placeholder: "Ex: 70000" },
    { label: "Ticket Médio (R$)", key: "ticketMedio", placeholder: "Ex: 45" },
    { label: "Investimento Anterior (R$)", key: "investimentoAnterior", placeholder: "Ex: 8000" },
  ]

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
          <span style={{ color: "#6e7a70" }}>Ferramentas</span>
          <span style={{ color: "#4a5450" }}>/</span>
          <span style={{ color: "#e6efe8", fontWeight: 600 }}>Calculadora de Investimento</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "28px 28px", flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs card */}
          <div
            style={{
              background: "#141f18",
              border: "1px solid #1f2a23",
              borderRadius: 10,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#e6efe8",
                marginBottom: 4,
              }}
            >
              Dados de Entrada
            </h2>
            {inputFields.map(({ label, key, placeholder }) => (
              <div key={key}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#6e7a70",
                    marginBottom: 6,
                  }}
                >
                  {label}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputs[key]}
                  onChange={handleChange(key)}
                  placeholder={placeholder}
                  style={{
                    width: "100%",
                    background: "#0f1813",
                    border: "1px solid #1f2a23",
                    borderRadius: 8,
                    color: "#e6efe8",
                    fontSize: 13,
                    padding: "9px 14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#7DC128")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#1f2a23")}
                />
              </div>
            ))}
            <button
              onClick={handleSave}
              disabled={!hasInputs}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: hasInputs ? "#7DC128" : "#182219",
                color: hasInputs ? "#0a1408" : "#4a5450",
                fontSize: 13,
                fontWeight: 700,
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                cursor: hasInputs ? "pointer" : "not-allowed",
                transition: "all 0.15s",
                marginTop: 4,
              }}
            >
              <Save style={{ width: 16, height: 16 }} />
              Salvar Cálculo
            </button>
          </div>

          {/* Results card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#e6efe8",
              }}
            >
              Resultados
            </h2>
            <MetricCard
              label="% via Tráfego Pago"
              value={`${formatNumber(results.percTrafico)}%`}
              sub="do faturamento total"
              accent="#5b8ad4"
            />
            <MetricCard
              label="ROAS Atual"
              value={formatNumber(results.roasAtual)}
              sub="retorno sobre investimento"
              accent="#7DC128"
            />
            <MetricCard
              label="Pedidos Necessários"
              value={formatNumber(results.pedidosNecessarios, 0)}
              sub="para atingir a meta"
              accent="#e8a73a"
            />
            <MetricCard
              label="Investimento Necessário"
              value={formatBRL(results.investimentoNecessario)}
              sub="total para atingir a meta"
              accent="#a855f7"
            />
            <MetricCard
              label="Investimento Adicional"
              value={formatBRL(results.investimentoAdicional)}
              sub={results.investimentoAdicional >= 0 ? "a mais que o anterior" : "de redução possível"}
              accent={results.investimentoAdicional >= 0 ? "#d85a4a" : "#7DC128"}
            />
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div
            style={{
              background: "#141f18",
              border: "1px solid #1f2a23",
              borderRadius: 10,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e6efe8" }}>Histórico de Cálculos</h2>
              <button
                onClick={handleClearHistory}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "#6e7a70",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#d85a4a")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#6e7a70")}
              >
                <Trash2 style={{ width: 14, height: 14 }} />
                Limpar Histórico
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((entry, idx) => (
                <HistoryRow
                  key={idx}
                  entry={entry}
                  isExpanded={expandedIndex === idx}
                  onToggle={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div
      style={{
        background: "#141f18",
        border: "1px solid #1f2a23",
        borderRadius: 10,
        padding: 16,
      }}
    >
      <p
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#6e7a70",
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 26,
          fontWeight: 700,
          color: accent,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: 11, color: "#6e7a70", marginTop: 4 }}>{sub}</p>
    </div>
  )
}

function HistoryRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: CalcResult
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div
      style={{
        background: "#182219",
        border: "1px solid #1f2a23",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          textAlign: "left",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        {isExpanded ? (
          <ChevronDown style={{ width: 14, height: 14, color: "#6e7a70", flexShrink: 0 }} />
        ) : (
          <ChevronRight style={{ width: 14, height: 14, color: "#6e7a70", flexShrink: 0 }} />
        )}
        <span
          style={{
            fontSize: 11,
            color: "#6e7a70",
            flexShrink: 0,
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {entry.savedAt}
        </span>
        <span style={{ fontSize: 13, color: "#e6efe8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Meta: {formatBRL(parseNum(entry.inputs.metaFaturamento))}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#7DC128",
            flexShrink: 0,
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Inv. Nec: {formatBRL(entry.investimentoNecessario)}
        </span>
      </button>
      {isExpanded && (
        <div
          style={{
            padding: "12px 16px 16px",
            borderTop: "1px dashed #1f2a23",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <Detail label="Faturamento Total" value={formatBRL(parseNum(entry.inputs.faturamentoTotal))} />
          <Detail label="Fat. Tráfego Pago" value={formatBRL(parseNum(entry.inputs.faturamentoTrafico))} />
          <Detail label="Meta de Faturamento" value={formatBRL(parseNum(entry.inputs.metaFaturamento))} />
          <Detail label="Ticket Médio" value={formatBRL(parseNum(entry.inputs.ticketMedio))} />
          <Detail label="Invest. Anterior" value={formatBRL(parseNum(entry.inputs.investimentoAnterior))} />
          <Detail label="% via Tráfego" value={`${formatNumber(entry.percTrafico)}%`} />
          <Detail label="ROAS Atual" value={formatNumber(entry.roasAtual)} />
          <Detail label="Pedidos Necessários" value={formatNumber(entry.pedidosNecessarios, 0)} />
          <Detail label="Invest. Necessário" value={formatBRL(entry.investimentoNecessario)} />
          <Detail label="Invest. Adicional" value={formatBRL(entry.investimentoAdicional)} />
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: "#6e7a70", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{label}</p>
      <p
        style={{
          fontSize: 13,
          color: "#a8b3aa",
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          marginTop: 2,
        }}
      >
        {value}
      </p>
    </div>
  )
}
