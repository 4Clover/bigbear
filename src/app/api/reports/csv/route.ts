import { NextResponse } from 'next/server'
import { exportReportToCsv } from '@/actions/reports'
import { authenticatedRoute } from '@/lib/api/route-gates'

export const GET = authenticatedRoute(['OWNER', 'ACCOUNTANT'], async (request) => {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString())
    const monthParam = searchParams.get('month')
    const month = monthParam ? parseInt(monthParam) : undefined

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    }

    const csv = await exportReportToCsv(year, month)

    const filename = month
      ? `transactions-${year}-${month.toString().padStart(2, '0')}.csv`
      : `transactions-${year}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 })
  }
})
