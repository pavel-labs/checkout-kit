import { type Locator, type Page } from '@playwright/test'
import { ROUTES } from '../data/routes'
import { TEXT } from '../data/text'

export class FailurePage {
  readonly page: Page
  readonly heading: Locator
  readonly canceledHeading: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByText(TEXT.paymentFailed)
    this.canceledHeading = page.getByText(TEXT.paymentCanceled)
  }

  async goto() {
    await this.page.goto(ROUTES.failure)
  }
}
