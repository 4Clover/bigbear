import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import WorkerNav from '@/components/worker/WorkerNav'

const WorkerLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth()

  if (!session?.user || session.user.role !== 'WORKER') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <WorkerNav user={session.user} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}

export default WorkerLayout
