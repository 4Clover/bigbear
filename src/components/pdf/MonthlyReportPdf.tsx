import { Document, Page, Text, View } from '@react-pdf/renderer'
import { styles, formatCurrencyPdf } from './styles'
import type { MonthlyReportData } from '@/actions/reports'

interface MonthlyReportPdfProps {
  data: MonthlyReportData
}

export const MonthlyReportPdf = ({ data }: MonthlyReportPdfProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Monthly Financial Report</Text>
        <Text style={styles.subtitle}>{data.period}</Text>
      </View>

      {/* Summary Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Income</Text>
          <Text style={[styles.statValue, styles.statValuePositive]}>
            {formatCurrencyPdf(data.income)}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Expenses</Text>
          <Text style={[styles.statValue, styles.statValueNegative]}>
            {formatCurrencyPdf(data.expenses)}
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

      {/* Category Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, { flex: 2 }]}>Category</Text>
            <Text style={[styles.tableCellHeader, styles.textRight, { flex: 1 }]}>Income</Text>
            <Text style={[styles.tableCellHeader, styles.textRight, { flex: 1 }]}>Expenses</Text>
            <Text style={[styles.tableCellHeader, styles.textRight, { flex: 1 }]}>Count</Text>
          </View>
          {Object.entries(data.byCategory).map(([name, values]) => (
            <View key={name} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{name}</Text>
              <Text style={[styles.tableCell, styles.textRight, { flex: 1 }]}>
                {values.income > 0 ? formatCurrencyPdf(values.income) : '-'}
              </Text>
              <Text style={[styles.tableCell, styles.textRight, { flex: 1 }]}>
                {values.expenses > 0 ? formatCurrencyPdf(values.expenses) : '-'}
              </Text>
              <Text style={[styles.tableCell, styles.textRight, { flex: 1 }]}>
                {values.transactions.length}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Generated on {new Date().toLocaleDateString()} • BigBear Property Management
      </Text>
    </Page>
  </Document>
)
