export type CheckoutIconName =
  | 'card'
  | 'bank'
  | 'mail'
  | 'lock'
  | 'arrow'
  | 'close'
  | 'check'
  | 'sun'
  | 'moon'
  | 'external'
  | 'sparkle'

const paths: Record<CheckoutIconName, string> = {
  card: 'M3 7h18M5 16h4M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
  bank: 'm3 9 9-6 9 6H3Zm2 3v6m7-6v6m7-6v6M3 21h18',
  mail: 'm3 6 9 7 9-7M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M6 10h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Zm6 5v2',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  close: 'm6 6 12 12M18 6 6 18',
  check: 'm5 12 4 4L19 6',
  sun: 'M12 3V1m0 22v-2M3 12H1m22 0h-2M5.6 5.6 4.2 4.2m15.6 15.6-1.4-1.4m-12.8 0-1.4 1.4M19.8 4.2l-1.4 1.4M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
  moon: 'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z',
  external: 'M7 17 17 7M7 7h10v10',
  sparkle: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
}

export const CheckoutIcon = ({ name }: { name: CheckoutIconName }) => (
  <svg
    className="checkout-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={paths[name]} />
  </svg>
)
