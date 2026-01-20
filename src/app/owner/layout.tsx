import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import OwnerNav from '@/components/owner/OwnerNav'

const OwnerLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth()

  if (!session?.user || session.user.role !== 'OWNER') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background flex">
      <OwnerNav user={session.user} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}

export default OwnerLayout
