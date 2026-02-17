import { auth } from '@/lib/auth'
import { Header, Footer } from '@/components/layout'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header session={session} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
