import { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Button, Field, Select } from '@checkout-kit/ui'
import type { CardScenario } from '@checkout-kit/testing'
import type { CheckoutFormInput } from '../model/schema'

const SCENARIOS = [
  { value: 'approve', label: 'Successful payment' },
  { value: 'decline', label: 'Card declined' },
  { value: 'challengePass', label: '3-D Secure challenge' },
  { value: 'processing', label: 'Processing payment' },
] satisfies { value: CardScenario; label: string }[]

export function DemoFixtures({
  collectsCard,
  disabled,
}: {
  collectsCard: boolean
  disabled: boolean
}) {
  const { setValue } = useFormContext<CheckoutFormInput>()
  const [scenario, setScenario] = useState<CardScenario>('approve')
  const [cards, setCards] = useState<Record<CardScenario, string>>()

  useEffect(() => {
    let active = true
    void import('@checkout-kit/testing').then(({ SCENARIO_CARDS }) => {
      if (active) setCards(SCENARIO_CARDS)
    })
    return () => {
      active = false
    }
  }, [])

  const fill = () => {
    if (!cards) return
    const options = { shouldDirty: true, shouldTouch: true, shouldValidate: true }
    setValue('email', 'alex@example.com', options)
    setValue('billing.country', 'US', options)
    setValue('billing.postalCode', '10001', options)
    if (collectsCard) {
      setValue('card.number', cards[scenario], options)
      setValue('card.holder', 'Alex Morgan', options)
      setValue('card.exp', '12 / 30', options)
      setValue('card.cvc', '123', options)
    }
  }

  return (
    <div className="demo-fixtures">
      <p>Try a complete payment with example details. Please don’t use a real card.</p>
      <div className="demo-fixtures__controls">
        {collectsCard ? (
          <Field label="Test scenario">
            {(control) => (
              <Select
                {...control}
                options={SCENARIOS}
                value={scenario}
                disabled={disabled}
                onChange={(event) => setScenario(event.target.value as CardScenario)}
              />
            )}
          </Field>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          fullWidth={false}
          disabled={disabled || !cards}
          onClick={fill}
        >
          Fill test details
        </Button>
      </div>
    </div>
  )
}
