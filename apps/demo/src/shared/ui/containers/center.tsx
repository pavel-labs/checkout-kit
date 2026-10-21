import type { ReactNode } from 'react'

interface IProps {
  children: ReactNode
}

export const Center = ({ children }: IProps) => <div className="demo-outcome">{children}</div>
