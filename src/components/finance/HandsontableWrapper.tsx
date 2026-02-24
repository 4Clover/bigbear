'use client'

import dynamic from 'next/dynamic'
import type { HandsontableInnerProps } from './HandsontableInner'

const HandsontableInner = dynamic(
  () => import('./HandsontableInner').then((mod) => mod.HandsontableInner),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted rounded-lg h-64" />,
  }
)

export type { HandsontableInnerProps }

export function HandsontableWrapper(props: HandsontableInnerProps) {
  return <HandsontableInner {...props} />
}
