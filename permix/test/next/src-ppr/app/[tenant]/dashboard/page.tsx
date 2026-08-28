import { PermissionHoles } from '../../features/permission-holes'

export default function DashboardPage() {
  return (
    <main>
      <h1 data-testid="dashboard-shell">Dashboard</h1>
      <PermissionHoles />
    </main>
  )
}
