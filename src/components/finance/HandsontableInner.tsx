'use client'

import { HotTable } from '@handsontable/react-wrapper'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/styles/handsontable.min.css'
import 'handsontable/styles/ht-theme-main.min.css'

// Handsontable non-commercial license — owner personal use only
registerAllModules()

export interface HandsontableInnerProps {
  data: unknown[][]
  colHeaders: string[]
  columns?: object[]
  onChange?: (changes: unknown) => void
  height?: number | string
  readOnly?: boolean
  licenseKey?: string
}

export function HandsontableInner({
  data,
  colHeaders,
  columns,
  onChange,
  height,
  readOnly,
  licenseKey,
}: HandsontableInnerProps) {
  return (
    <HotTable
      data={data}
      colHeaders={colHeaders}
      columns={columns}
      licenseKey={licenseKey ?? 'non-commercial-and-evaluation'}
      afterChange={(changes) => {
        onChange?.(changes)
      }}
      height={height ?? 400}
      readOnly={readOnly ?? false}
    />
  )
}
