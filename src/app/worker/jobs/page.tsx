import { getAvailableJobs, getAssignedJobs } from '@/actions/maintenance'
import WorkerJobsClient from './WorkerJobsClient'

export default async function WorkerJobsPage() {
  const [available, assigned] = await Promise.all([getAvailableJobs(), getAssignedJobs()])

  return <WorkerJobsClient initialAvailable={available} initialAssigned={assigned} />
}
