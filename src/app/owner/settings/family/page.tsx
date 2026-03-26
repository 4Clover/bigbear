import { prisma } from '@/lib/prisma'
import { FamilyManagement } from './FamilyManagement'

export const metadata = {
  title: 'Family Members - Owner Dashboard',
}

export default async function FamilySettingsPage() {
  const members = await prisma.user.findMany({
    where: { isFamilyMember: true },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { name: 'asc' },
  })

  const serialized = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    createdAt: m.createdAt.toISOString(),
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Family Members</h1>
        <p className="text-muted-foreground">Manage family members who can book without payment.</p>
      </div>

      <FamilyManagement initialMembers={serialized} />
    </div>
  )
}
