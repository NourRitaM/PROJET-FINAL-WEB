import { useState } from 'react'
import ActivityForm from './ActivityForm'
import OrganizerDashboard from './OrganizerDashboard'

export default function App() {
  const [activityVersion, setActivityVersion] = useState(0)

  return (
    <main>
      <ActivityForm
        onCreated={() => setActivityVersion((version) => version + 1)}
      />
      <OrganizerDashboard refreshVersion={activityVersion} />
    </main>
  )
}