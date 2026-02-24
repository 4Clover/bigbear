import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import OwnerNav from '@/components/owner/OwnerNav'

const OwnerLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth()

  if (!session?.user || session.user.role !== 'OWNER') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <MobileSidebar>
        <OwnerNav user={session.user} />
      </MobileSidebar>
      <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  )
}

export default OwnerLayout
