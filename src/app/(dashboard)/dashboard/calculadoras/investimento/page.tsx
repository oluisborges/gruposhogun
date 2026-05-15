import { requireAuth } from "@/lib/auth-guards"
import { InvestmentCalculator } from "@/components/calculadoras/investment-calculator"

export default async function InvestimentoPage() {
  await requireAuth()
  return (
    <div className="space-y-6">
      <InvestmentCalculator />
    </div>
  )
}
