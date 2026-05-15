"use client"

import { useState, useEffect, useCallback } from "react"
import { formatBRL, formatNumber } from "@/lib/formatting"
import { Calculator, Save, Trash2, ChevronDown, ChevronRight } from "lucide-react"

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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-red-500/10 rounded-md">
          <Calculator className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Calculadora de Investimento</h1>
          <p className="text-sm text-neutral-400">Calcule o investimento necessário para atingir sua meta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">Dados de Entrada</h2>
          {inputFields.map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-neutral-400 mb-1">{label}</label>
              <input
                type="text"
                inputMode="decimal"
                value={inputs[key]}
                onChange={handleChange(key)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
            </div>
          ))}
          <button
            onClick={handleSave}
            disabled={!hasInputs}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Salvar Cálculo
          </button>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Resultados</h2>
          <div className="grid grid-cols-1 gap-3">
            <MetricCard
              label="% via Tráfego Pago"
              value={`${formatNumber(results.percTrafico)}%`}
              sub="do faturamento total"
              color="blue"
            />
            <MetricCard
              label="ROAS Atual"
              value={formatNumber(results.roasAtual)}
              sub="retorno sobre investimento"
              color="green"
            />
            <MetricCard
              label="Pedidos Necessários"
              value={formatNumber(results.pedidosNecessarios, 0)}
              sub="para atingir a meta"
              color="yellow"
            />
            <MetricCard
              label="Investimento Necessário"
              value={formatBRL(results.investimentoNecessario)}
              sub="total para atingir a meta"
              color="purple"
            />
            <MetricCard
              label="Investimento Adicional"
              value={formatBRL(results.investimentoAdicional)}
              sub={results.investimentoAdicional >= 0 ? "a mais que o anterior" : "de redução possível"}
              color={results.investimentoAdicional >= 0 ? "red" : "green"}
            />
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Histórico de Cálculos</h2>
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Histórico
            </button>
          </div>
          <div className="space-y-2">
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
  )
}

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: "blue" | "green" | "yellow" | "purple" | "red"
}) {
  const colorMap = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
  }

  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
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
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-750 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-neutral-500 flex-shrink-0" />
        )}
        <span className="text-xs text-neutral-500 flex-shrink-0">{entry.savedAt}</span>
        <span className="text-sm text-white truncate flex-1">
          Meta: {formatBRL(parseNum(entry.inputs.metaFaturamento))}
        </span>
        <span className="text-sm font-medium text-green-400 flex-shrink-0">
          Inv. Nec: {formatBRL(entry.investimentoNecessario)}
        </span>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-3 border-t border-neutral-700 pt-3">
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
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-sm text-white font-medium">{value}</p>
    </div>
  )
}
