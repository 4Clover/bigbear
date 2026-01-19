'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
}

export const Pagination = ({ page, totalPages, total, pageSize }: PaginationProps) => {
  const searchParams = useSearchParams()

  const createPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pageNum))
    return `?${params.toString()}`
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  if (totalPages <= 1) return null

  const buttonBase = `
    relative inline-flex items-center px-2 py-2
    ring-1 ring-inset ring-border
    transition-colors duration-200
  `
  const buttonActive = `
    text-muted-foreground
    hover:bg-muted hover:text-foreground
    focus:z-20
  `
  const buttonDisabled = `
    text-stone-300 dark:text-stone-600
    cursor-not-allowed
  `

  return (
    <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6">
      {/* Mobile pagination */}
      <div className="flex flex-1 justify-between sm:hidden">
        {page > 1 ? (
          <Link
            href={createPageUrl(page - 1)}
            className="relative inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Previous
          </Link>
        ) : (
          <span className="relative inline-flex items-center rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed">
            Previous
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={createPageUrl(page + 1)}
            className="relative ml-3 inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Next
          </Link>
        ) : (
          <span className="relative ml-3 inline-flex items-center rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed">
            Next
          </span>
        )}
      </div>

      {/* Desktop pagination */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{start}</span> to{' '}
            <span className="font-medium text-foreground">{end}</span> of{' '}
            <span className="font-medium text-foreground">{total}</span> results
          </p>
        </div>
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="Pagination"
          >
            {page > 1 ? (
              <Link
                href={createPageUrl(page - 1)}
                className={`${buttonBase} ${buttonActive} rounded-l-md`}
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" />
              </Link>
            ) : (
              <span className={`${buttonBase} ${buttonDisabled} rounded-l-md`}>
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" />
              </span>
            )}
            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-foreground ring-1 ring-inset ring-border">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={createPageUrl(page + 1)}
                className={`${buttonBase} ${buttonActive} rounded-r-md`}
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" />
              </Link>
            ) : (
              <span className={`${buttonBase} ${buttonDisabled} rounded-r-md`}>
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" />
              </span>
            )}
          </nav>
        </div>
      </div>
    </div>
  )
}
