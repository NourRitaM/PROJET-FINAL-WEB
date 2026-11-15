export function MissionVolunteers({ registrations }) {
  if (registrations.length === 0) {
    return <p>No volunteers registered yet.</p>
  }

  return (
    <div>
      <p>Registered volunteers</p>
      <ul>
        {registrations.map((volunteer) => (
          <li key={volunteer.id}>{volunteer.name}</li>
        ))}
      </ul>
    </div>
  )
}