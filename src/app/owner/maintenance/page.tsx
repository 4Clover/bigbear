import type { ComponentProps } from 'react'
import { getMaintenanceJobs, getWorkers } from '@/actions/maintenance'
import MaintenanceClient from './MaintenanceClient'

export default async function OwnerMaintenancePage() {
  const [jobs, workers] = await Promise.all([
    getMaintenanceJobs(undefined, { page: 1 }),
    getWorkers(),
  ])

  // Owner layout guarantees the OWNER code path in getMaintenanceJobs,
  // which returns full user includes matching MaintenanceClient's Prisma types
  return (
    <MaintenanceClient
      initialJobs={jobs as ComponentProps<typeof MaintenanceClient>['initialJobs']}
      initialWorkers={workers}
    />
  )
}
