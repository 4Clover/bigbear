import { Document, Page, Text, View } from '@react-pdf/renderer'
import { styles, formatCurrencyPdf } from './styles'
import type { ScheduleEReportData } from '@/actions/reports'

interface ScheduleEReportPdfProps {
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

export const ScheduleEReportPdf = ({ data }: ScheduleEReportPdfProps) => {
  const netIncome = data.rentalIncome - data.totalExpenses

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Schedule E (Form 1040)</Text>
          <Text style={styles.subtitle}>
            Supplemental Income and Loss - Tax Year {data.year}
          </Text>
        </View>

        {/* Income Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.textBold, { width: 60 }]}>Line 3</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>Rents received</Text>
              <Text style={[styles.tableCell, styles.textRight, { width: 100 }]}>
                {formatCurrencyPdf(data.rentalIncome)}
              </Text>
            </View>
          </View>
        </View>

        {/* Expenses Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { width: 60 }]}>Line</Text>
              <Text style={[styles.tableCellHeader, { flex: 1 }]}>Description</Text>
              <Text style={[styles.tableCellHeader, styles.textRight, { width: 100 }]}>Amount</Text>
            </View>
            {data.lineItems.map((item) => (
              <View key={item.line} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.textBold, { width: 60 }]}>{item.line}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {SCHEDULE_E_LINE_DESCRIPTIONS[item.line] ?? 'Other expenses'}
                </Text>
                <Text style={[styles.tableCell, styles.textRight, { width: 100 }]}>
                  {formatCurrencyPdf(item.total)}
                </Text>
              </View>
            ))}
            <View style={styles.tableFooter}>
              <Text style={[styles.tableCell, styles.textBold, { width: 60 }]}>Line 20</Text>
              <Text style={[styles.tableCell, styles.textBold, { flex: 1 }]}>Total expenses</Text>
              <Text style={[styles.tableCell, styles.textRight, styles.textBold, { width: 100 }]}>
                {formatCurrencyPdf(data.totalExpenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* Net Income Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Net Income (Loss)</Text>
          <View style={styles.table}>
            <View style={styles.tableFooter}>
              <Text style={[styles.tableCell, styles.textBold, { width: 60 }]}>Line 21</Text>
              <Text style={[styles.tableCell, styles.textBold, { flex: 1 }]}>
                Subtract line 20 from line 3
              </Text>
              <Text style={[styles.tableCell, styles.textRight, styles.textBold, { width: 100 }]}>
                {formatCurrencyPdf(netIncome)}
              </Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Disclaimer: This report is for informational purposes only and is not intended as tax
            advice. Please consult a qualified tax professional for accurate tax preparation.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {new Date().toLocaleDateString()} • BigBear Property Management
        </Text>
      </Page>
    </Document>
  )
}
