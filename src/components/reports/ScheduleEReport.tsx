import { formatCurrency } from '@/lib/format'
import type { ScheduleEReportData } from '@/actions/reports'

interface ScheduleEReportProps {
  data: ScheduleEReportData
}

const SCHEDULE_E_LINE_DESCRIPTIONS: Record<string, string> = {
  'Line 3': 'Rents received',
  'Line 5': 'Advertising',
  'Line 6': 'Auto and travel',
  'Line 7': 'Cleaning and maintenance',
  'Line 8': 'Commissions',
  'Line 9': 'Insurance',
  'Line 10': 'Legal and other professional fees',
  'Line 11': 'Management fees',
  'Line 12': 'Mortgage interest paid to banks, etc.',
  'Line 13': 'Other interest',
  'Line 14': 'Repairs',
  'Line 15': 'Supplies',
  'Line 16': 'Taxes',
  'Line 17': 'Utilities',
  'Line 18': 'Depreciation expense or depletion',
  'Line 19': 'Other',
}

export const ScheduleEReport = ({ data }: ScheduleEReportProps) => {
  const netIncome = data.rentalIncome - data.totalExpenses

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-950">Schedule E (Form 1040)</h2>
            <p className="text-sm text-stone-600">
              Supplemental Income and Loss - Tax Year {data.year}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-stone-600">For reference only</p>
            <p className="text-xs text-stone-500">Consult a tax professional</p>
          </div>
        </div>
      </div>

      {/* Income Section */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 bg-emerald-50">
          <h3 className="text-lg font-semibold text-emerald-800">Income</h3>
        </div>
        <table className="min-w-full">
          <tbody>
            <tr className="border-b border-stone-200">
              <td className="px-6 py-4 text-sm font-medium text-stone-950">Line 3</td>
              <td className="px-6 py-4 text-sm text-stone-800">Rents received</td>
              <td className="px-6 py-4 text-sm text-right font-medium text-emerald-600">
                {formatCurrency(data.rentalIncome)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Expenses Section */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-800">Expenses</h3>
        </div>
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase">
                Line
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase">
                Categories
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-stone-600 uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            {data.lineItems.map((item) => (
              <tr key={item.line} className="hover:bg-stone-50">
                <td className="px-6 py-4 text-sm font-medium text-stone-950">{item.line}</td>
                <td className="px-6 py-4 text-sm text-stone-800">
                  {SCHEDULE_E_LINE_DESCRIPTIONS[item.line] ?? 'Other expenses'}
                </td>
                <td className="px-6 py-4 text-sm text-stone-600">{item.categories.join(', ')}</td>
                <td className="px-6 py-4 text-sm text-right font-medium text-red-600">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-stone-100">
            <tr>
              <td className="px-6 py-4 text-sm font-bold text-stone-950">Line 20</td>
              <td className="px-6 py-4 text-sm font-bold text-stone-950" colSpan={2}>
                Total expenses
              </td>
              <td className="px-6 py-4 text-sm text-right font-bold text-red-600">
                {formatCurrency(data.totalExpenses)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Net Income Section */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 bg-blue-50">
          <h3 className="text-lg font-semibold text-blue-800">Net Income (Loss)</h3>
        </div>
        <table className="min-w-full">
          <tbody>
            <tr>
              <td className="px-6 py-4 text-sm font-bold text-stone-950">Line 21</td>
              <td className="px-6 py-4 text-sm font-bold text-stone-950">
                Subtract line 20 from line 3
              </td>
              <td
                className={`px-6 py-4 text-sm text-right font-bold ${netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {formatCurrency(netIncome)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-sm text-yellow-800">
          <strong>Disclaimer:</strong> This report is for informational purposes only and is not
          intended as tax advice. Please consult a qualified tax professional for accurate tax
          preparation.
        </p>
      </div>
    </div>
  )
}
