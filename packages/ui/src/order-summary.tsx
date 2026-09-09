import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'
import { DetailItem, DetailList } from './detail-list'
import { Money } from './money'
import { Panel } from './panel'
import type { HeadingLevel } from './section'

export interface OrderLine {
  readonly id: string
  readonly name: ReactNode
  /** Minor units. Omit for a line whose price is not a number - "Free", "Calculated later". */
  readonly amount?: number
  /** Shown in place of a formatted amount. */
  readonly value?: ReactNode
  readonly description?: ReactNode
  readonly quantity?: number
  /** A thumbnail. The kit draws no image of its own. */
  readonly media?: ReactNode
}

export interface OrderSummaryProps {
  /** The things being bought. */
  items?: readonly OrderLine[]
  /** Subtotal, shipping, tax, discount - whatever your pricing actually has. */
  adjustments?: readonly OrderLine[]
  total?: OrderLine
  currency: string
  locale?: string
  title?: ReactNode
  headingLevel?: HeadingLevel
  /** Off when the summary already sits inside a card of yours. */
  panel?: boolean
  footer?: ReactNode
  className?: string
}

const lineValue = (line: OrderLine, currency: string, locale?: string): ReactNode =>
  line.value ??
  (line.amount === undefined ? null : (
    <Money amount={line.amount} currency={currency} locale={locale} />
  ))

/**
 * What the shopper is about to pay for, and what it adds up to. No pricing happens here -
 * where the rounding lands is your tax logic's business, not the checkout's.
 */
export const OrderSummary = ({
  items = [],
  adjustments = [],
  total,
  currency,
  locale,
  title = 'Order summary',
  headingLevel,
  panel = true,
  footer,
  className,
}: OrderSummaryProps): ReactElement => {
  const body = (
    <>
      {items.length > 0 ? (
        <ul className="ck-order-items">
          {items.map((item) => (
            <li key={item.id} className="ck-order-item">
              {item.media ? <span className="ck-order-item__media">{item.media}</span> : null}
              <span className="ck-order-item__body">
                <span className="ck-order-item__name">
                  {item.name}
                  {item.quantity !== undefined && item.quantity > 1 ? (
                    <span className="ck-order-item__quantity">&times;{item.quantity}</span>
                  ) : null}
                </span>
                {item.description ? (
                  <span className="ck-order-item__description">{item.description}</span>
                ) : null}
              </span>
              <span className="ck-order-item__value">{lineValue(item, currency, locale)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {adjustments.length > 0 || total ? (
        <DetailList>
          {adjustments.map((line) => (
            <DetailItem key={line.id} name={line.name} value={lineValue(line, currency, locale)} />
          ))}
          {total ? (
            <DetailItem total name={total.name} value={lineValue(total, currency, locale)} />
          ) : null}
        </DetailList>
      ) : null}

      {footer}
    </>
  )

  return panel ? (
    <Panel title={title} headingLevel={headingLevel} className={cx('ck-order-summary', className)}>
      {body}
    </Panel>
  ) : (
    <div className={cx('ck-order-summary', className)}>{body}</div>
  )
}
