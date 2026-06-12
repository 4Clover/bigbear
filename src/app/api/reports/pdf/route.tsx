/* eslint-disable react-hooks/error-boundaries -- server route: renderToStream renders
   synchronously and rejects into the surrounding catch; no React error boundary exists here */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import ReactPDF from '@react-pdf/renderer'
import {
  generateMonthlyReport,
  generateAnnualReport,
  generateScheduleEReport,
} from '@/actions/reports'
import { MonthlyReportPdf } from '@/components/pdf/MonthlyReportPdf'
import { AnnualReportPdf } from '@/components/pdf/AnnualReportPdf'
import { ScheduleEReportPdf } from '@/components/pdf/ScheduleEReportPdf'

type ReportType = 'monthly' | 'annual' | 'schedule-e'

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const session = await auth()
  if (!session?.user || !['OWNER', 'ACCOUNTANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') ?? 'monthly') as ReportType
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString())
    const monthParam = searchParams.get('month')
    const month = monthParam ? parseInt(monthParam) : new Date().getMonth() + 1

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    if (!['monthly', 'annual', 'schedule-e'].includes(type)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    if (type === 'monthly' && (isNaN(month) || month < 1 || month > 12)) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    }

    let pdfStream: NodeJS.ReadableStream

    if (type === 'monthly') {
      const data = await generateMonthlyReport(year, month)
      pdfStream = await ReactPDF.renderToStream(<MonthlyReportPdf data={data} />)
    } else if (type === 'annual') {
      const data = await generateAnnualReport(year)
      pdfStream = await ReactPDF.renderToStream(<AnnualReportPdf data={data} />)
    } else {
      const data = await generateScheduleEReport(year)
      pdfStream = await ReactPDF.renderToStream(<ScheduleEReportPdf data={data} />)
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of pdfStream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const pdfBuffer = Buffer.concat(chunks)

    let filename = `report-${year}`
    if (type === 'monthly') filename += `-${month.toString().padStart(2, '0')}`
    filename += `-${type}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
