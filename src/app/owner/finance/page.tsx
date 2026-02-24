import Link from 'next/link'
import { getTransactions, getFinanceSummary, getExpenseCategories } from '@/actions/finance'
import { FinanceStats } from '@/components/finance/FinanceStats'
import { TransactionFilters } from '@/components/finance/TransactionFilters'
import { TransactionTable } from '@/components/finance/TransactionTable'
import { MobileExpenseList } from '@/components/finance/MobileExpenseList'
import type { TransactionType } from '@prisma/client'

interface SearchParams {
  type?: string
  categoryId?: string
  search?: string
  from?: string
  to?: string
  page?: string
}

const FinancePage = async ({ searchParams }: { searchParams: Promise<SearchParams> }) => {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const page = params.page ? parseInt(params.page, 10) : 1

  const [paginatedTransactions, summary, categories] = await Promise.all([
    getTransactions(
      {
        type: params.type as TransactionType | undefined,
        categoryId: params.categoryId,
        search: params.search,
        startDate: params.from ? new Date(params.from) : undefined,
        endDate: params.to ? new Date(params.to) : undefined,
      },
      { page }
    ),
    getFinanceSummary(currentYear),
    getExpenseCategories(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground">Track income, expenses, and receipts</p>
        </div>
        <Link
          href="/owner/finance/expenses"
          className="px-4 py-2 bg-forest-600 text-white text-sm font-medium rounded-lg hover:bg-forest-700 transition-colors"
        >
          Add Expense
        </Link>
      </div>

      <FinanceStats
        income={summary.income}
        expenses={summary.expenses}
        netIncome={summary.netIncome}
        transactionCount={summary.transactionCount}
      />

      <TransactionFilters
        categories={categories}
        currentType={params.type}
        currentCategoryId={params.categoryId}
        currentSearch={params.search}
        currentFrom={params.from}
        currentTo={params.to}
      />

      <div className="block md:hidden">
        <MobileExpenseList categories={categories} />
      </div>

      <div className="hidden md:block">
        <TransactionTable
          transactions={paginatedTransactions.data}
          page={paginatedTransactions.page}
          totalPages={paginatedTransactions.totalPages}
          total={paginatedTransactions.total}
          pageSize={paginatedTransactions.pageSize}
        />
      </div>
    </div>
  )
}

export default FinancePage
