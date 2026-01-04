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
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          &larr; Back to Finance
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Add Expense</h1>
        <p className="text-gray-500">Record a new expense with receipts</p>
      </div>

      <ExpenseForm categories={categories} />
    </div>
  )
}

export default AddExpensePage
