import Link from 'next/link'
import { getExpenseCategories } from '@/actions/finance'
import { ExcelImportFlow } from '@/components/finance/ExcelImportFlow'

const ImportExcelPage = async () => {
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
        <h1 className="mt-2 text-2xl font-bold text-foreground">Import Excel</h1>
        <p className="text-muted-foreground">
          Upload an Excel file to import or replace transactions for a time period
        </p>
      </div>

      <ExcelImportFlow categories={categories} />
    </div>
  )
}

export default ImportExcelPage
