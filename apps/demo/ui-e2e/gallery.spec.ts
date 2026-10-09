import { expect, test, type Page } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

const checkout = (page: Page) => page.getByRole('region', { name: 'Checkout preview', exact: true })

test.beforeEach(async ({ page }) => {
  await page.goto('/gallery')
  await expect(
    page.getByRole('heading', { name: 'Checkout UI, down to the details.' }),
  ).toBeVisible()
})

for (const theme of ['light', 'dark']) {
  test(`${theme} components and brand variants pass automated accessibility checks`, async ({
    page,
  }, info) => {
    await page.getByLabel('Theme', { exact: true }).selectOption(theme)
    for (const accent of ['Blue', 'Violet', 'Green', 'Rose', 'Ink']) {
      await page.getByRole('button', { name: `${accent} accent` }).click()
      // Remove hover/focus from the swatch before assessing component contrast.
      await page.getByRole('heading', { name: 'Checkout UI, down to the details.' }).click()
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    }
    await page.getByRole('button', { name: 'Blue accent' }).click()
    await info.attach(`${theme}-checkout`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  })
}

test('the preview edits fields, switches methods and shows a result without calling a payment API', async ({
  page,
}) => {
  const mutations: string[] = []
  page.on('request', (request) => {
    if (request.method() !== 'GET' && /\/api\//.test(request.url())) mutations.push(request.url())
  })
  await checkout(page).getByRole('button', { name: 'Clear email address' }).click()
  await expect(checkout(page).getByLabel('Email address')).toBeFocused()
  await checkout(page).getByLabel('Email address').fill('buyer@example.com')
  await checkout(page).getByRole('tab', { name: 'Bank transfer' }).click()
  await expect(checkout(page).getByRole('heading', { name: 'Pay from your bank' })).toBeVisible()
  await checkout(page).getByRole('tab', { name: 'Card', exact: true }).click()
  await checkout(page).getByRole('button', { name: 'Pay $25.00' }).click()
  await expect(
    checkout(page).getByRole('heading', { name: 'Confirming your payment' }),
  ).toBeVisible()
  await checkout(page).getByRole('button', { name: 'Preview success' }).click()
  await expect(checkout(page).getByRole('heading', { name: 'Payment successful' })).toBeVisible()
  await expect(checkout(page).getByText('buyer@example.com')).toBeVisible()
  await expect(checkout(page).locator('.ck-state')).toBeFocused()
  await checkout(page).getByRole('button', { name: 'Back to preview' }).click()
  await expect(checkout(page).getByLabel('Email address')).toHaveValue('buyer@example.com')
  await expect(checkout(page).getByLabel('Email address')).toBeFocused()
  expect(mutations).toEqual([])
})

test('keyboard users can switch payment methods, use radios and dismiss a sheet with restored focus', async ({
  page,
}) => {
  const card = checkout(page).getByRole('tab', { name: 'Card', exact: true })
  await card.focus()
  await page.keyboard.press('ArrowRight')
  await expect(checkout(page).getByRole('tab', { name: 'Bank transfer' })).toBeFocused()
  await expect(checkout(page).getByRole('tab', { name: 'Bank transfer' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.keyboard.press('ArrowLeft')
  const saved = checkout(page).getByRole('radio', { name: /Visa ending in 4242/ })
  await saved.focus()
  await page.keyboard.press('ArrowDown')
  await expect(checkout(page).getByRole('radio', { name: 'Use a different card' })).toBeChecked()
  await expect(checkout(page).getByLabel('Example card number')).toBeVisible()
  const open = page.getByRole('button', { name: 'Open a sheet' })
  await open.click()
  const dialog = page.getByRole('dialog', { name: 'Why do you need my address?' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAccessibleDescription('Your bank may use it to verify the payment.')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(open).toBeFocused()
  await open.click()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await expect(open).toBeFocused()
})

test('narrow containers and compact density fit without page overflow or small touch targets', async ({
  page,
}, info) => {
  await page.getByLabel('Density', { exact: true }).selectOption('compact')
  for (const width of ['390', '320']) {
    await page.getByLabel('Frame width', { exact: true }).selectOption(width)
    const metrics = await page.evaluate(() => {
      const frame = document.querySelector('.gallery-preview__viewport')!
      const button = document.querySelector('.preview-payment .ck-button[type="submit"]')!
      return {
        pageWidth: document.documentElement.clientWidth,
        pageScroll: document.documentElement.scrollWidth,
        frameWidth: frame.clientWidth,
        frameScroll: frame.scrollWidth,
        buttonHeight: button.getBoundingClientRect().height,
      }
    })
    expect(metrics.pageScroll).toBeLessThanOrEqual(metrics.pageWidth + 1)
    expect(metrics.frameScroll).toBeLessThanOrEqual(metrics.frameWidth + 1)
    expect(metrics.buttonHeight).toBeGreaterThanOrEqual(44)
  }
  await info.attach('compact-narrow-checkout', {
    body: await page.locator('.gallery-preview').screenshot(),
    contentType: 'image/png',
  })
})

test('RTL and reduced motion preserve field and result layouts', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // A merchant supplies direction; this is a layout fixture, not a UI-only RTL toggle.
  await page.locator('.gallery-kit').evaluate((root) => root.setAttribute('dir', 'rtl'))
  await page.getByLabel('Frame width', { exact: true }).selectOption('320')
  await page.getByLabel('Preview state', { exact: true }).selectOption('success')
  await expect(checkout(page).getByRole('heading', { name: 'Payment successful' })).toBeVisible()
  const layout = await checkout(page).evaluate((root) => ({
    overflow: root.scrollWidth > root.clientWidth + 1,
    direction: getComputedStyle(root).direction,
    iconAnimation: getComputedStyle(root.querySelector('.ck-icon__mark')!).animationName,
  }))
  expect(layout).toEqual({ overflow: false, direction: 'rtl', iconAnimation: 'none' })
  await info.attach('rtl-result', {
    body: await page.locator('.gallery-preview').screenshot(),
    contentType: 'image/png',
  })
})

test('a destructive action stays red and keeps readable text during pointer interaction', async ({
  page,
}) => {
  const danger = page.getByRole('button', { name: 'Delete payment method' })
  if (await page.evaluate(() => matchMedia('(hover: hover)').matches)) await danger.hover()
  await expect
    .poll(async () =>
      danger.evaluate((button) => {
        const context = document.createElement('canvas').getContext('2d')!
        const pixels = (color: string) => {
          context.clearRect(0, 0, 1, 1)
          context.fillStyle = color
          context.fillRect(0, 0, 1, 1)
          return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
        }
        const style = getComputedStyle(button)
        const background = pixels(style.backgroundColor)
        const foreground = pixels(style.color)
        const luminance = (color: number[]) =>
          color
            .map((value) => {
              const channel = value / 255
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
            })
            .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
        const a = luminance(background),
          b = luminance(foreground)
        return (
          background[0] > background[2] * 2 &&
          (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5
        )
      }),
    )
    .toBe(true)
})
