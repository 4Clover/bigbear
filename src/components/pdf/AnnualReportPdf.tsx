import { Document, Page, Text, View } from '@react-pdf/renderer'
import { styles, formatCurrencyPdf } from './styles'
import type { AnnualReportData } from '@/actions/reports'

interface AnnualReportPdfProps {
  data: AnnualReportData
}

export const AnnualReportPdf = ({ data }: AnnualReportPdfProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Annual Financial Report</Text>
        <Text style={styles.subtitle}>Tax Year {data.year}</Text>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Income</Text>
          <Text style={[styles.statValue, styles.statValuePositive]}>
            {formatCurrencyPdf(data.totalIncome)}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Expenses</Text>
          <Text style={[styles.statValue, styles.statValueNegative]}>
            {formatCurrencyPdf(data.totalExpenses)}
          </Text>
        </View>
        <View style={[styles.statBox, { marginRight: 0 }]}>
          <Text style={styles.statLabel}>Net Income</Text>
          <Text
            style={[
              styles.statValue,
              data.netIncome >= 0 ? styles.statValuePositive : styles.statValueNegative,
            ]}
          >
            {formatCurrencyPdf(data.netIncome)}
          </Text>
        </View>
      </View>

      {/* Monthly Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, { flex: 1 }]}>Month</Text>
            <Text style={[styles.tableCellHeader, styles.textRight, { flex: 1 }]}>Income</Text>
            <Text style={[styles.tableCellHeader, styles.textRight, { flex: 1 }]}>Expenses</Text>
            <Text style={[styles.tableCellHeader, styles.textRight, { flex: 1 }]}>Net</Text>
          </View>
          {data.monthlyBreakdown.map((month) => (
            <View key={month.month} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{month.month}</Text>
              <Text style={[styles.tableCell, styles.textRight, { flex: 1 }]}>
                {formatCurrencyPdf(month.income)}
              </Text>
              <Text style={[styles.tableCell, styles.textRight, { flex: 1 }]}>
                {formatCurrencyPdf(month.expenses)}
              </Text>
              <Text style={[styles.tableCell, styles.textRight, { flex: 1 }]}>
                {formatCurrencyPdf(month.net)}
              </Text>
            </View>
          ))}
          <View style={styles.tableFooter}>
            <Text style={[styles.tableCell, styles.textBold, { flex: 1 }]}>Total</Text>
            <Text style={[styles.tableCell, styles.textRight, styles.textBold, { flex: 1 }]}>
              {formatCurrencyPdf(data.totalIncome)}
            </Text>
            <Text style={[styles.tableCell, styles.textRight, styles.textBold, { flex: 1 }]}>
              {formatCurrencyPdf(data.totalExpenses)}
            </Text>
            <Text style={[styles.tableCell, styles.textRight, styles.textBold, { flex: 1 }]}>
              {formatCurrencyPdf(data.netIncome)}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Generated on {new Date().toLocaleDateString()} • BigBear Property Management
      </Text>
    </Page>
  </Document>
)
