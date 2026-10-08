import { expect, test } from '@playwright/test'

for (const provider of ['Stripe', 'Adyen']) {
  for (const scenario of ['approve', 'decline', 'processing', 'challenge']) {
    test(`${provider}: ${scenario} through its installed API contract`, async ({ page }) => {
      await page.goto('/')
      await page.getByRole('radio', { name: new RegExp(`${provider} adapter`) }).check()
      await page.getByLabel('Payment token').fill(`pm_mock_${scenario}`)
      await page.getByRole('button', { name: /^Pay/ }).click()
      if (scenario === 'challenge') {
        await expect(page.getByRole('heading', { name: 'Simulated approval' })).toBeVisible()
        await page.getByRole('button', { name: 'Approve', exact: true }).click()
      }
      await expect(
        page.getByRole('heading', {
          name: scenario === 'decline' ? 'Payment declined' : 'Payment successful',
          exact: true,
        }),
      ).toBeVisible()
      if (scenario !== 'decline')
        await expect(page.getByText(provider.toLowerCase(), { exact: true })).toBeVisible()
      if (scenario === 'challenge') {
        expect(new URL(page.url()).pathname).toBe('/')
        expect(
          await page.evaluate(() => sessionStorage.getItem('checkout-kit:pending-checkout')),
        ).toBeNull()
      }
    })
  }
}
for (const outcome of ['Approve', 'Decline']) {
  test(`PayPal: ${outcome.toLowerCase()} after a full-page return`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('radio', { name: /PayPal adapter/ }).check()
    await page.getByRole('button', { name: /^Pay/ }).click()
    await expect(page.getByRole('heading', { name: 'Simulated approval' })).toBeVisible()
    await page.getByRole('button', { name: outcome, exact: true }).click()
    await expect(
      page.getByRole('heading', {
        name: outcome === 'Approve' ? 'Payment successful' : 'Payment cancelled',
        exact: true,
      }),
    ).toBeVisible()
    expect(
      await page.evaluate(() => sessionStorage.getItem('checkout-kit:pending-checkout')),
    ).toBeNull()
  })
}
test('a declined retry creates a fresh payment', async ({ page }) => {
  const ids: string[] = []
  page.on('response', (response) => {
    if (response.url() === 'http://localhost:4000/stripe/payments' && response.status() === 201)
      void response.json().then((body: { id: string }) => ids.push(body.id))
  })
  await page.goto('/')
  await page.getByRole('radio', { name: /Stripe adapter/ }).check()
  await page.getByLabel('Payment token').fill('pm_mock_decline')
  await page.getByRole('button', { name: /^Pay/ }).click()
  await expect(page.getByRole('heading', { name: 'Payment declined', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await page.getByLabel('Payment token').fill('pm_mock_approve')
  await page.getByRole('button', { name: /^Pay/ }).click()
  await expect(page.getByRole('heading', { name: 'Payment successful', exact: true })).toBeVisible()
  expect(ids).toHaveLength(2)
  expect(ids[0]).not.toBe(ids[1])
})
