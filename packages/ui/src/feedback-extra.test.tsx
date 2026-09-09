import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CopyButton } from './copy-button'
import { Countdown } from './countdown'
import { Skeleton, SkeletonText } from './skeleton'

afterEach(cleanup)

describe('Skeleton', () => {
  // A stutter of "loading, loading, loading" is worse than silence; the group speaks once.
  it('says nothing on its own', () => {
    const { container } = render(<Skeleton />)

    expect(container.firstElementChild!.getAttribute('aria-hidden')).toBe('true')
  })

  it('announces the wait once for a whole paragraph', () => {
    render(<SkeletonText lines={3} />)

    const status = screen.getByRole('status')

    expect(status.getAttribute('aria-busy')).toBe('true')
    expect(status.textContent).toBe('Loading')
  })

  it('draws the number of lines it was asked for', () => {
    const { container } = render(<SkeletonText lines={4} />)

    expect(container.querySelectorAll('.ck-skeleton').length).toBe(4)
  })
})

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the time left as minutes and seconds', () => {
    render(<Countdown expiresAt={Date.now() + 125_000} />)

    expect(screen.getByText('2:05')).toBeDefined()
  })

  // A live region that speaks every second is unusable, so the clock is silent while it runs.
  it('stays quiet while it is running', () => {
    render(<Countdown expiresAt={Date.now() + 125_000} />)

    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('off')
  })

  it('says so, out loud, once it has run out', async () => {
    render(<Countdown expiresAt={Date.now() + 1000} />)

    await vi.advanceTimersByTimeAsync(1500)

    await waitFor(() => {
      const status = screen.getByRole('status')
      expect(status.textContent).toBe('Expired')
      expect(status.getAttribute('aria-live')).toBe('polite')
    })
  })

  it('reports the expiry to the host', async () => {
    const onExpire = vi.fn()
    render(<Countdown expiresAt={Date.now() + 1000} onExpire={onExpire} />)

    await vi.advanceTimersByTimeAsync(1500)

    await waitFor(() => expect(onExpire).toHaveBeenCalled())
  })

  it('is already expired when the deadline has passed', () => {
    render(<Countdown expiresAt={Date.now() - 1000} />)

    expect(screen.getByText('Expired')).toBeDefined()
  })

  it('lets the host word the clock', () => {
    render(
      <Countdown expiresAt={Date.now() + 65_000}>
        {(remaining) => `Pay within ${remaining}`}
      </Countdown>,
    )

    expect(screen.getByText('Pay within 1:05')).toBeDefined()
  })
})

describe('CopyButton', () => {
  it('copies the value and confirms it in the label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    render(<CopyButton value="GB33BUKB20201555555555" />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(screen.getByRole('button').textContent).toBe('Copied'))
    expect(writeText).toHaveBeenCalledWith('GB33BUKB20201555555555')

    vi.unstubAllGlobals()
  })

  // Denied permission or an insecure origin. The value is on screen and selectable anyway.
  it('says nothing rather than lying when the clipboard refuses', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error()) } })

    render(<CopyButton value="GB33" />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(screen.getByRole('button').textContent).toBe('Copy'))

    vi.unstubAllGlobals()
  })
})
