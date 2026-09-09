import { DetailList, DetailItem, Receipt, StatusText } from '@checkout-kit/ui'
import type { Transaction } from '../model/transaction'

interface IProps {
  transaction: Transaction
  errorMessage?: string
}

export const TransactionDetails = ({ transaction, errorMessage }: IProps) => (
  <Receipt>
    <DetailList>
      <DetailItem name="Amount" value={transaction.amount} />
      <DetailItem name="Transaction ID" value={transaction.id} />
      <DetailItem name="Payment method" value={transaction.paymentMethod} />
      <DetailItem name="Merchant" value={transaction.merchant} />
    </DetailList>
    {errorMessage ? <StatusText tone="failure">{errorMessage}</StatusText> : null}
  </Receipt>
)
