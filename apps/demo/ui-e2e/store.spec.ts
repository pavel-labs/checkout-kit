import { expect, test } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Payment details', exact: true })).toBeVisible()
})

test('the selected catalog price reaches the order, pay button and payment request', async ({
  page,
}) => {
  await page.getByRole('group', { name: 'Choose your plan' }).getByText('Yearly').click()
  await expect(page.locator('.demo-order .ck-order-summary')).toContainText('$125.00')
  const pay = page.getByRole('button', { name: 'Continue payment $125.00' })
  await expect(pay).toBeVisible()
  await page.getByRole('button', { name: 'Fill test details' }).click()
  const response = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/payment-intents') && response.request().method() === 'POST',
  )
  await pay.click()
  const created = await response
  expect(created.request().postDataJSON()).toMatchObject({ planId: '2id' })
  expect(await created.json()).toMatchObject({ amount: 12500, currency: 'USD' })
  await expect(page.getByRole('heading', { name: 'Payment successful' })).toBeVisible()
  await expect(page.locator('.demo-outcome')).toContainText('$125.00')
})

test('a declined example can be retried without losing the chosen plan', async ({ page }) => {
  await page.getByRole('group', { name: 'Choose your plan' }).getByText('Yearly').click()
  await page.getByLabel('Test scenario').selectOption('decline')
  await page.getByRole('button', { name: 'Fill test details' }).click()
  await page.getByRole('button', { name: /Continue payment/ }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('radio', { name: /Yearly/ })).toBeChecked()
  await page.getByLabel('Test scenario').selectOption('approve')
  await page.getByRole('button', { name: 'Fill test details' }).click()
  await page.getByRole('button', { name: /Continue payment/ }).click()
  await expect(page.getByRole('heading', { name: 'Payment successful' })).toBeVisible()
})

test('the store fits narrow screens and both themes keep the form accessible', async ({
  page,
}, info) => {
  await page.getByRole('button', { name: 'Fill test details' }).click()
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click()
    await expect(page.locator('.demo-store')).toHaveAttribute('data-ck-theme', theme)
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue('alex@example.com')
    await page.getByRole('heading', { name: 'Payment details', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Fill test details' })).toHaveCSS('opacity', '1')
    const metrics = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.width + 1)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    await info.attach(`${theme}-demo-store`, {
      body: await page.screenshot({ fullPage: true, scale: 'css' }),
      contentType: 'image/png',
    })
  }
  await page.reload()
  await expect(page.locator('.demo-store')).toHaveAttribute('data-ck-theme', 'dark')
})

test('the store and gallery link to each other', async ({ page }) => {
  await page
    .getByRole('navigation', { name: 'Demo navigation' })
    .getByRole('link', { name: 'UI Gallery' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Checkout UI, down to the details.' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Demo store', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Payment details', exact: true })).toBeVisible()
})
