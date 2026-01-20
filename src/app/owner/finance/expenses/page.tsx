import Link from 'next/link'
import { getExpenseCategories } from '@/actions/finance'
import { ExpenseForm } from '@/components/finance/ExpenseForm'

const AddExpensePage = async () => {
  const categories = await getExpenseCategories()

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/owner/finance"
          className="text-sm text-forest-600 hover:text-forest-700 dark:text-forest-400 dark:hover:text-forest-300 font-medium"
        >
          &larr; Back to Finance
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Add Expense</h1>
        <p className="text-muted-foreground">Record a new expense with receipts</p>
      </div>

      <ExpenseForm categories={categories} />
    </div>
  )
}

export default AddExpensePage
