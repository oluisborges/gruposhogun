import { requireAuth } from "@/lib/auth-guards"
import { InvestmentCalculator } from "@/components/calculadoras/investment-calculator"

export default async function InvestimentoPage() {
  await requireAuth()
  return (
    <div className="flex flex-col" style={{ minHeight: "100vh" }}>
      <InvestmentCalculator />
    </div>
  )
}
