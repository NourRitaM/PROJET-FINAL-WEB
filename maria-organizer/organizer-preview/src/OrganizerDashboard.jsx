import { useEffect, useState } from 'react'

const apiUrl = import.meta.env.VITE_API_URL

function exportParticipants(activity) {
  const rows = [
    ['Activity', 'Mission', 'Volunteer'],
    ...activity.missions.flatMap((mission) =>
      (mission.registrations ?? []).map((volunteer) => [
        activity.title,
        mission.name,
        volunteer.name,
      ])
    ),
  ]

  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? '')
          // Keep spreadsheet apps from interpreting text as a formula.
          const safeText = /^\s*[=+\-@]/.test(text) ? `'${text}` : text
          return `"${safeText.replaceAll('"', '""')}"`
        })
        .join(',')
    )
    .join('\r\n')

  const file = new Blob(['\uFEFF', csv], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')

  link.href = url
  link.download = `activity-${activity.id}-participants.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function OrganizerDashboard({ refreshVersion }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editError, setEditError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadActivities() {
      setLoading(true)
      setLoadError('')

      try {
        const response = await fetch(`${apiUrl}/api/organizer/activities`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Could not load activities.')
        }

        const list = await response.json()
        if (!controller.signal.aborted) {
          setActivities(list)
        }
      } catch {
        if (!controller.signal.aborted) {
          setLoadError('Could not load activities. Refresh the page to try again.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadActivities()
    return () => controller.abort()
  }, [refreshVersion])

  async function sendChange(path, method, body, failureMessage) {
    setEditError('')
    setSaving(true)

    try {
      const options = { method }

      if (body !== undefined) {
        options.headers = { 'Content-Type': 'application/json' }
        options.body = JSON.stringify(body)
      }

      const response = await fetch(`${apiUrl}${path}`, options)

      if (method === 'DELETE' && response.status === 204) {
        return { ok: true }
      }

      const data = await response.json().catch(() => null)

      if (!response.ok || !data) {
        setEditError(data?.message || failureMessage)
        return { ok: false }
      }

      return { ok: true, data }
    } catch {
      setEditError('Could not reach the server. Please try again.')
      return { ok: false }
    } finally {
      setSaving(false)
    }
  }

  function replaceActivity(id, update) {
    setActivities((current) =>
      current.map((activity) => (activity.id === id ? update(activity) : activity))
    )
  }

  async function updateActivity(id, changes, failureMessage) {
    const result = await sendChange(
      `/api/activities/${id}`,
      'PATCH',
      changes,
      failureMessage
    )

    if (result.ok) {
      replaceActivity(id, (activity) => ({
        ...activity,
        ...result.data,
        missions: result.data.missions.map((mission) => ({
          ...activity.missions.find((item) => item.id === mission.id),
          ...mission,
        })),
      }))
    }

    return result.ok
  }

  async function saveActivity(event, id) {
    event.preventDefault()
    const changes = Object.fromEntries(new FormData(event.currentTarget))
    const saved = await updateActivity(id, changes, 'Could not save changes.')

    if (saved) {
      setEditingId(null)
    }
  }

  async function cancelActivity(activity) {
    if (!window.confirm(`Cancel "${activity.title}"?`)) return

    await updateActivity(
      activity.id,
      { status: 'cancelled' },
      'Could not cancel the activity.'
    )
  }

  function validateMission(name, capacity) {
    if (name && Number.isInteger(capacity) && capacity >= 1) {
      return true
    }

    setEditError('Enter a mission name and a whole number of spots (at least 1).')
    return false
  }

  async function addMission(event, activityId) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const name = String(fields.get('name') ?? '').trim()
    const capacity = Number(fields.get('capacity'))

    if (!validateMission(name, capacity)) return

    const result = await sendChange(
      `/api/activities/${activityId}/missions`,
      'POST',
      { name, capacity },
      'Could not add the mission.'
    )

    if (result.ok) {
      replaceActivity(activityId, (activity) => ({
        ...activity,
        missions: [...activity.missions, { registrations: [], ...result.data }],
      }))
      form.reset()
    }
  }

  async function editMission(activityId, mission) {
    const name = window.prompt('Mission name', mission.name)
    if (name === null) return

    const spots = window.prompt('Number of spots', String(mission.capacity))
    if (spots === null) return

    const trimmedName = name.trim()
    const capacity = Number(spots)
    if (!validateMission(trimmedName, capacity)) return

    const result = await sendChange(
      `/api/activities/${activityId}/missions/${mission.id}`,
      'PATCH',
      { name: trimmedName, capacity },
      'Could not update the mission.'
    )

    if (result.ok) {
      replaceActivity(activityId, (activity) => ({
        ...activity,
        missions: activity.missions.map((item) =>
          item.id === mission.id ? { ...item, ...result.data } : item
        ),
      }))
    }
  }

  async function removeMission(activityId, mission) {
    if (!window.confirm(`Remove "${mission.name}"?`)) return

    const result = await sendChange(
      `/api/activities/${activityId}/missions/${mission.id}`,
      'DELETE',
      undefined,
      'Could not remove the mission.'
    )

    if (result.ok) {
      replaceActivity(activityId, (activity) => ({
        ...activity,
        missions: activity.missions.filter((item) => item.id !== mission.id),
      }))
    }
  }

  return (
    <section>
      <h2>My Activities</h2>

      {loading && <p>Loading activities…</p>}
      {loadError && <p role="alert">{loadError}</p>}
      {editError && <p role="alert">{editError}</p>}
      {!loading && !loadError && activities.length === 0 && (
        <p>No activities yet.</p>
      )}

      {activities.map((activity) => (
        <article key={activity.id}>
          <h3>{activity.title}</h3>
          <p>{activity.date} at {activity.time} · {activity.location}</p>
          <p>{activity.status === 'cancelled' ? 'Cancelled' : 'Active'}</p>

          <ul>
            {activity.missions.map((mission) => {
              const registrations = mission.registrations
              const hasRegistrationList = Array.isArray(registrations)
              const spotsLeft = hasRegistrationList
                ? Math.max(0, mission.capacity - registrations.length)
                : null

              return (
                <li key={mission.id}>
                  {mission.name} · {mission.capacity}{' '}
                  {mission.capacity === 1 ? 'spot' : 'spots'} total

                  {hasRegistrationList && (
                    <div>
                      <p>
                        {registrations.length} of {mission.capacity}{' '}
                        {mission.capacity === 1 ? 'spot' : 'spots'} filled
                        {' · '}
                        {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
                      </p>

                      {registrations.length === 0 ? (
                        <p>No volunteers registered yet.</p>
                      ) : (
                        <ul aria-label="Registered volunteers">
                          {registrations.map((volunteer) => (
                            <li key={volunteer.id}>{volunteer.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {activity.status === 'active' && editingId === null && (
                    <div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => editMission(activity.id, mission)}
                      >
                        Edit Mission
                      </button>
                      <button
                        type="button"
                        disabled={saving || activity.missions.length === 1}
                        onClick={() => removeMission(activity.id, mission)}
                      >
                        Remove Mission
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {activity.status === 'active' && editingId === null && (
            <form onSubmit={(event) => addMission(event, activity.id)}>
              <fieldset disabled={saving}>
                <legend>Add a mission</legend>
                <p>
                  <label>
                    Mission name <input name="name" required />
                  </label>
                </p>
                <p>
                  <label>
                    Number of spots{' '}
                    <input
                      name="capacity"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue="1"
                      required
                    />
                  </label>
                </p>
                <button type="submit">Add Mission</button>
              </fieldset>
            </form>
          )}

          {editingId === activity.id ? (
            <form onSubmit={(event) => saveActivity(event, activity.id)}>
              <fieldset disabled={saving}>
                <legend>Edit activity</legend>
                <p>
                  <label>
                    Title <input name="title" defaultValue={activity.title} required />
                  </label>
                </p>
                <p>
                  <label>
                    Date{' '}
                    <input name="date" type="date" defaultValue={activity.date} required />
                  </label>
                </p>
                <p>
                  <label>
                    Time{' '}
                    <input name="time" type="time" defaultValue={activity.time} required />
                  </label>
                </p>
                <p>
                  <label>
                    Location <input name="location" defaultValue={activity.location} required />
                  </label>
                </p>
                <p>
                  <label>
                    Description{' '}
                    <textarea name="description" defaultValue={activity.description} required />
                  </label>
                </p>
                <button type="submit">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditingId(null)}>
                  Close Editor
                </button>
              </fieldset>
            </form>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEditError('')
                setEditingId(activity.id)
              }}
            >
              Edit
            </button>
          )}

          {activity.status !== 'cancelled' && (
            <button
              type="button"
              disabled={saving || editingId !== null}
              onClick={() => cancelActivity(activity)}
            >
              Cancel Activity
            </button>
          )}

          <button type="button" onClick={() => exportParticipants(activity)}>
            Export Participants CSV
          </button>
        </article>
      ))}
    </section>
  )
}