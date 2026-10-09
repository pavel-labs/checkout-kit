export type GalleryIconName = 'card' | 'bank' | 'mail' | 'lock' | 'arrow' | 'close' | 'check'

const paths: Record<GalleryIconName, string> = {
  card: 'M3 7h18M5 16h4M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
  bank: 'm3 9 9-6 9 6H3Zm2 3v6m7-6v6m7-6v6M3 21h18',
  mail: 'm3 6 9 7 9-7M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M6 10h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Zm6 5v2',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  close: 'm6 6 12 12M18 6 6 18',
  check: 'm5 12 4 4L19 6',
}

export const GalleryIcon = ({ name }: { name: GalleryIconName }) => (
  <svg
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
