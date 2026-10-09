import { expect, test } from '@playwright/test'

for (const locale of [
  { path: '', hero: 'Try the demo', nav: 'Demo' },
  { path: 'ru/', hero: 'Попробовать демо', nav: 'Демо' },
]) {
  for (const name of [locale.hero, locale.nav]) {
    test(`${locale.path || 'en'} ${name} leaves the documentation router`, async ({ page }) => {
      await page.goto(`/checkout-kit/${locale.path}`)
      // The bug only appears after VitePress hydrates and starts intercepting clicks.
      await page.getByRole('button', { name: 'Search', exact: true }).click()
      await expect(page.getByRole('searchbox')).toBeVisible()
      await page.keyboard.press('Escape')
      const link = page.getByRole('link', { name, exact: true })
      await expect(link).toHaveAttribute('target', '_self')
      await link.click()
      await expect(page).toHaveURL(/\/checkout-kit\/demo\/$/)
      await expect(page.locator('#root')).toBeVisible()
      await expect(page.getByText('PAGE NOT FOUND', { exact: true })).toHaveCount(0)
    })
  }
}

test('a demo deep link keeps its path, query and hash through the Pages 404 shim', async ({
  page,
}) => {
  await page.goto('/checkout-kit/demo/gallery?theme=dark&brand=default#components')
  await expect(page).toHaveURL('/checkout-kit/demo/gallery?theme=dark&brand=default#components')
  await expect(
    page.getByRole('heading', { name: 'Checkout UI, down to the details.' }),
  ).toBeVisible()
})

test('a missing documentation page still shows the documentation 404', async ({ page }) => {
  await page.goto('/checkout-kit/missing-guide.html')
  await expect(page.getByText('PAGE NOT FOUND', { exact: true })).toBeVisible()
})
