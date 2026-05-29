import { redirect } from 'next/navigation'
import CRM from './crm'
import { getSessionUser } from '@/lib/auth'

export default async function Home() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return <CRM currentUser={user} />
}
