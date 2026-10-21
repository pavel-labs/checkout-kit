import { useFormContext, useWatch } from 'react-hook-form'
import { Badge, Disclosure, Money, OrderSummary as Summary } from '@checkout-kit/ui'
import { CheckoutIcon } from '@/shared/ui/icons/checkout'
import type { Plan } from '@/entities/plan'
import { toInvoice } from '../model/to-invoice'
import type { CheckoutFormInput } from '../model/schema'
import { PlanSelector } from './plan-selector'

interface OrderSummaryProps {
  plans: Plan[]
}

const PlanBenefits = () => (
  <ul className="demo-benefits">
    {[
      'Unlimited projects',
      'A shared team workspace',
      'Room for every big idea',
      'Priority support',
    ].map((benefit) => (
      <li key={benefit}>
        <CheckoutIcon name="check" />
        {benefit}
      </li>
    ))}
  </ul>
)

export const OrderSummary = ({ plans }: OrderSummaryProps) => {
  const { control } = useFormContext<CheckoutFormInput>()
  const planId = useWatch({ control, name: 'planId' })
  const plan = plans.find((candidate) => candidate.id === planId)

  const invoice = plan ? toInvoice(plan) : null

  if (!invoice || !plan) return null

  return (
    <div className="demo-order">
      <div className="demo-product-label">
        <span className="demo-product-mark" aria-hidden="true">
          <CheckoutIcon name="sparkle" />
        </span>
        <span>
          Studio <strong>Plus</strong>
        </span>
        <Badge>Workspace plan</Badge>
      </div>
      <div className="demo-product-intro">
        <p className="demo-eyebrow">Make space for what’s next</p>
        <h2>
          Your ideas.
          <br />A little less limited.
        </h2>
        <p>A shared home for your projects, your team and whatever comes next.</p>
      </div>
      <div className="demo-order-price">
        <Money
          amount={Math.round(invoice.total * 100)}
          currency={plan.currencyISO}
          locale="en-US"
        />
        <span>
          {plan.name} plan · {plan.currencyISO}
        </span>
      </div>
      <PlanSelector plans={plans} />
      <div className="demo-benefits-desktop">
        <PlanBenefits />
      </div>
      <Disclosure className="demo-benefits-mobile" summary="What’s included in Studio Plus?">
        <PlanBenefits />
      </Disclosure>
      <Summary
        panel={false}
        currency={plan.currencyISO}
        locale="en-US"
        adjustments={[
          {
            id: 'plan',
            name: `${plan.name} subscription`,
            amount: Math.round(invoice.subtotal * 100),
          },
          ...(invoice.discount
            ? [{ id: 'discount', name: 'Promotion included', value: invoice.discount }]
            : []),
        ]}
        total={{ id: 'total', name: 'Total due', amount: Math.round(invoice.total * 100) }}
      />
      <p className="demo-order-note">Example pricing. This demo does not create a subscription.</p>
    </div>
  )
}
