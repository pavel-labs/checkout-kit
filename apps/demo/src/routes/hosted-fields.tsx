import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Field, Input, TrustStrip } from '@checkout-kit/ui'

// The provider's card fields, standing in for a frame served from the provider's origin.
//
// In production this page is not ours and not on our origin; here it is a route in the same
// app, because a front-end-only mock cannot serve a second origin. The mechanism is the
// same either way: the card is typed here, swapped for a token here, and only the token
// leaves.

interface HostedFieldsSearch {
  actionId?: string
}

export const Route = createFileRoute('/hosted-fields')({
  validateSearch: (search: Record<string, unknown>): HostedFieldsSearch => ({
    actionId: typeof search.actionId === 'string' ? search.actionId : undefined,
  }),
  component: HostedFields,
})

function HostedFields() {
  const { actionId } = Route.useSearch()
  const [cardNumber, setCardNumber] = useState('')
  const [busy, setBusy] = useState(false)

  // A click, not a form submission. The frame is sandboxed without `allow-forms` - it has
  // no business navigating anything - and real hosted fields do not submit either: they
  // tokenize over fetch and answer with a message.
  const handlePay = async () => {
    if (busy) return
    setBusy(true)

    const response = await fetch(`${import.meta.env.BASE_URL}api/hosted-fields/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardNumber }),
    })
    const { token } = (await response.json()) as { token: string }

    // A token and an action id. Never the card - the parent has no way to ask for it.
    window.parent.postMessage({ type: 'ck-fields-token', actionId, token }, '*')
  }

  return (
    <div className="demo-hosted-fields">
      <Field label="Card number" hint="Example details, collected inside the provider frame.">
        {(control) => (
          <Input
            {...control}
            name="cardNumber"
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
            value={cardNumber}
            onChange={(event) => setCardNumber(event.target.value)}
          />
        )}
      </Field>
      <Button type="button" onClick={() => void handlePay()} disabled={busy}>
        Pay securely
      </Button>
      <TrustStrip>Simulated provider · Test details only</TrustStrip>
    </div>
  )
}
