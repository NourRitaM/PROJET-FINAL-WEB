import { useRef, useState } from 'react'

export default function ActivityForm({ onCreated }) {
  const nextMissionId = useRef(2)
  const [missions, setMissions] = useState([
    { id: 1, name: '', capacity: '1' },
  ])
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function addMission() {
    const id = nextMissionId.current++
    setMissions((current) => [...current, { id, name: '', capacity: '1' }])
  }

  function updateMission(id, field, value) {
    setMissions((current) =>
      current.map((mission) =>
        mission.id === id ? { ...mission, [field]: value } : mission
      )
    )
  }

  function removeMission(id) {
    setMissions((current) => current.filter((mission) => mission.id !== id))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)

    const activity = {
      title: fields.get('title').trim(),
      date: fields.get('date'),
      time: fields.get('time'),
      location: fields.get('location').trim(),
      description: fields.get('description').trim(),
      missions: missions.map((mission) => ({
        name: mission.name.trim(),
        capacity: Number(mission.capacity),
      })),
    }

    setError('')
    setPreview(null)

    if (!activity.title || !activity.location || !activity.description) {
      setError('Enter a title, location, and description.')
      return
    }

    if (activity.missions.some(({ name }) => !name)) {
      setError('Enter a name for each mission.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      })

      if (!response.ok) {
        setError('Could not create the activity. Check the form and try again.')
        return
      }

      setPreview(await response.json())
      onCreated?.()
    } catch {
      setError('Could not reach the server. Make sure Express is running and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section>
      <h1>Create an Activity</h1>

      <form onSubmit={handleSubmit}>
        <p>
          <label>Title <input name="title" required /></label>
        </p>
        <p>
          <label>Date <input name="date" type="date" required /></label>
        </p>
        <p>
          <label>Time <input name="time" type="time" required /></label>
        </p>
        <p>
          <label>Location <input name="location" required /></label>
        </p>
        <p>
          <label>Description <textarea name="description" required /></label>
        </p>

        <h2>Missions</h2>

        {missions.map((mission, index) => (
          <fieldset key={mission.id}>
            <legend>Mission {index + 1}</legend>

            <p>
              <label>
                Mission name{' '}
                <input
                  value={mission.name}
                  onChange={(event) =>
                    updateMission(mission.id, 'name', event.target.value)
                  }
                  required
                />
              </label>
            </p>

            <p>
              <label>
                Number of spots{' '}
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={mission.capacity}
                  onChange={(event) =>
                    updateMission(mission.id, 'capacity', event.target.value)
                  }
                  required
                />
              </label>
            </p>

            <button
              type="button"
              onClick={() => removeMission(mission.id)}
              disabled={missions.length === 1}
            >
              Remove mission
            </button>
          </fieldset>
        ))}

        <p>
          <button type="button" onClick={addMission}>
            Add mission
          </button>
        </p>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating activity…' : 'Create Activity'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>

      {preview && (
        <section>
          <h2>Activity Created</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(preview, null, 2)}
          </pre>
        </section>
      )}
    </section>
  )
}