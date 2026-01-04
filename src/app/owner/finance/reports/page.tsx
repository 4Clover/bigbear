import Link from 'next/link'
import {
  generateMonthlyReport,
  generateAnnualReport,
  generateScheduleEReport,
} from '@/actions/reports'
import {
  ReportSelector,
  MonthlyReport,
  AnnualReport,
  ScheduleEReport,
  ExportButton,
  DownloadPdfButton,
} from '@/components/reports'

type ReportType = 'monthly' | 'annual' | 'schedule-e'

interface ReportsPageProps {
  searchParams: Promise<{
    type?: string
    year?: string
    month?: string
  }>
}

const ReportsPage = async ({ searchParams }: ReportsPageProps) => {
  const params = await searchParams

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const type = (params.type as ReportType | undefined) ?? 'monthly'
  const year = params.year ? parseInt(params.year) : currentYear
  const month = params.month ? parseInt(params.month) : currentMonth

  let reportData
  let reportComponent

  if (type === 'monthly') {
    reportData = await generateMonthlyReport(year, month)
    reportComponent = <MonthlyReport data={reportData} />
  } else if (type === 'annual') {
    reportData = await generateAnnualReport(year)
    reportComponent = <AnnualReport data={reportData} />
  } else {
    reportData = await generateScheduleEReport(year)
    reportComponent = <ScheduleEReport data={reportData} />
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/owner/finance" className="hover:text-emerald-600">
              Finance
            </Link>
            <span>/</span>
            <span>Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton year={year} month={type === 'monthly' ? month : undefined} />
          <DownloadPdfButton type={type} year={year} month={type === 'monthly' ? month : undefined} />
        </div>
      </div>

      {/* Report Selector */}
      <ReportSelector currentType={type} currentYear={year} currentMonth={month} />

      {/* Report Content */}
      {reportComponent}
    </div>
  )
}

export default ReportsPage
