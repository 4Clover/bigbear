import { StyleSheet } from '@react-pdf/renderer'

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statValuePositive: {
    color: '#059669',
  },
  statValueNegative: {
    color: '#dc2626',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableFooter: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 9,
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  textRight: {
    textAlign: 'right',
  },
  textBold: {
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
  disclaimer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#fefce8',
    borderRadius: 4,
  },
  disclaimerText: {
    fontSize: 9,
    color: '#854d0e',
  },
})

export const formatCurrencyPdf = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
