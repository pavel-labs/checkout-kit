import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { DetailList, DetailItem, Panel } from '@checkout-kit/ui'
import type { Plan } from '@/entities/plan'
import { toInvoice } from '../model/to-invoice'
import type { CheckoutFormInput } from '../model/schema'

interface OrderSummaryProps {
  plans: Plan[]
}

export const OrderSummary = ({ plans }: OrderSummaryProps) => {
  const { control } = useFormContext<CheckoutFormInput>()
  const planId = useWatch({ control, name: 'planId' })

  const invoice = useMemo(() => {
    const plan = plans.find((candidate) => candidate.id === planId)
    return plan ? toInvoice(plan) : null
  }, [plans, planId])

  if (!invoice) return null

  return (
    <Panel title="Order summary">
      <DetailList>
        <DetailItem name="Price" value={`${invoice.currency}${invoice.subtotal}`} />
        {invoice.discount ? <DetailItem name="Discount applied" value={invoice.discount} /> : null}
        <DetailItem name="Total due" total value={`${invoice.currency}${invoice.total}`} />
      </DetailList>
    </Panel>
  )
}
