import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import WorkerNav from '@/components/worker/WorkerNav'
import { MobileSidebar } from '@/components/layout/MobileSidebar'

const WorkerLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth()

  if (session?.user.role !== 'WORKER') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <MobileSidebar>
        <WorkerNav user={session.user} />
      </MobileSidebar>
      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  )
}

export default WorkerLayout
