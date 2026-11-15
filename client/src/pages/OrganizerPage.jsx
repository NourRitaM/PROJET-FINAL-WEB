import { useRef, useState } from 'react'
import { apiFetch } from '../api/client.js'
import { MissionVolunteers } from '../components/MissionVolunteers.jsx'
import { useApi } from '../hooks/useApi.js'

const activitiesPath = '/api/organizer/activities'

function exportParticipants(activity) {
  const rows = [
    ['Activity', 'Mission', 'Volunteer'],
    ...activity.missions.flatMap((mission) =>
      mission.registrations.map((volunteer) => [
        activity.title,
        mission.name,
        volunteer.name,
      ])
    ),
  ]

  const csv = rows
    .map((row) =>
      row.map((value) => {
        const text = String(value ?? '')
        const safeText = /^(?:\s*[=+\-@]|[\t\r\n])/.test(text) ? `'${text}` : text
        return `"${safeText.replaceAll('"', '""')}"`
      }).join(',')
    )
    .join('\r\n')

  const file = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `activity-${activity.id}-participants.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function ActivityFields({ activity }) {
  return (
    <>
      <p>
        <label>Title <input name="title" defaultValue={activity?.title} required /></label>
      </p>
      <p>
        <label>Date <input name="date" type="date" defaultValue={activity?.date} required /></label>
      </p>
      <p>
        <label>Start time <input name="time" type="time" defaultValue={activity?.time} required /></label>
      </p>
      <p>
        <label>End time <input name="endTime" type="time" defaultValue={activity?.endTime} required /></label>
      </p>
      <p>
        <label>Location <input name="location" defaultValue={activity?.location} required /></label>
      </p>
      <p>
        <label>Description <textarea name="description" defaultValue={activity?.description} required /></label>
      </p>
    </>
  )
}

function MissionFields({ mission, suffix = '' }) {
  return (
    <>
      <p>
        <label>
          Mission name{' '}
          <input name={`missionName${suffix}`} defaultValue={mission?.name} required />
        </label>
      </p>
      <p>
        <label>
          Number of spots{' '}
          <input
            name={`missionCapacity${suffix}`}
            type="number"
            min="1"
            max="2147483647"
            step="1"
            defaultValue={mission?.capacity ?? 1}
            required
          />
        </label>
      </p>
    </>
  )
}

function readMission(fields, suffix = '') {
  return {
    name: fields.get(`missionName${suffix}`).trim(),
    capacity: Number(fields.get(`missionCapacity${suffix}`)),
  }
}

export function OrganizerPage() {
  const { data, loading, error, reload } = useApi(activitiesPath)
  const activities = data ?? []
  const nextMissionId = useRef(2)

  const [missionIds, setMissionIds] = useState([1])
  const [editingId, setEditingId] = useState(null)
  const [editingMissionId, setEditingMissionId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')

  const busy = saving || loading
  const editorOpen = editingId !== null || editingMissionId !== null

  function addDraftMission() {
    const id = nextMissionId.current++
    setMissionIds((current) => [...current, id])
  }

  function removeDraftMission(id) {
    setMissionIds((current) => current.filter((missionId) => missionId !== id))
  }

  async function sendChange(path, method, body, onSuccess) {
    setActionError('')
    setSuccess('')
    setSaving(true)

    try {
      const result = await apiFetch(path, {
        method,
        body: JSON.stringify(body),
      })
      onSuccess(result)
      reload()
    } catch (requestError) {
      setActionError(requestError.message || 'Could not save the change.')
    } finally {
      setSaving(false)
    }
  }

  async function saveActivity(event, id) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)

    const activity = {
      title: fields.get('title').trim(),
      date: fields.get('date'),
      time: fields.get('time'),
      endTime: fields.get('endTime'),
      location: fields.get('location').trim(),
      description: fields.get('description').trim(),
    }

    if (activity.endTime <= activity.time) {
      setSuccess('')
      setActionError('End time must be later than start time.')
      return
    }

    if (id !== undefined) {
      await sendChange(`${activitiesPath}/${id}`, 'PATCH', activity, () => {
        setEditingId(null)
        setSuccess(`Activity updated: ${activity.title}`)
      })
      return
    }

    const missions = missionIds.map((missionId) => readMission(fields, `-${missionId}`))

    await sendChange(activitiesPath, 'POST', { ...activity, missions }, (created) => {
      form.reset()
      setMissionIds([1])
      setSuccess(`Activity created: ${created.title}`)
    })
  }

  async function cancelActivity(activity) {
    if (!window.confirm(`Cancel "${activity.title}"?`)) return

    await sendChange(
      `${activitiesPath}/${activity.id}`,
      'PATCH',
      { status: 'cancelled' },
      () => setSuccess(`Activity cancelled: ${activity.title}`)
    )
  }

  async function saveMission(event, activityId, missionId) {
    event.preventDefault()
    const form = event.currentTarget
    const mission = readMission(new FormData(form))
    const path = `${activitiesPath}/${activityId}/missions`

    if (missionId === undefined) {
      await sendChange(path, 'POST', mission, () => {
        form.reset()
        setSuccess(`Mission added: ${mission.name}`)
      })
      return
    }

    await sendChange(`${path}/${missionId}`, 'PATCH', mission, () => {
      setEditingMissionId(null)
      setSuccess(`Mission updated: ${mission.name}`)
    })
  }

  async function removeMission(activityId, mission) {
    if (!window.confirm(`Remove "${mission.name}"?`)) return

    await sendChange(
      `${activitiesPath}/${activityId}/missions/${mission.id}`,
      'DELETE',
      undefined,
      () => setSuccess(`Mission removed: ${mission.name}`)
    )
  }

  return (
    <main>
      <h1>Organizer space</h1>

      <section>
        <h2>Create an Activity</h2>
        <form onSubmit={saveActivity}>
          <fieldset disabled={busy}>
            <legend>Activity details</legend>
            <ActivityFields />

            {missionIds.map((id, index) => (
              <fieldset key={id}>
                <legend>Mission {index + 1}</legend>
                <MissionFields suffix={`-${id}`} />
                <button
                  type="button"
                  disabled={missionIds.length === 1}
                  onClick={() => removeDraftMission(id)}
                >
                  Remove mission
                </button>
              </fieldset>
            ))}

            <p><button type="button" onClick={addDraftMission}>Add mission</button></p>
            <button type="submit">Create Activity</button>
          </fieldset>
        </form>
      </section>

      {actionError && <p role="alert">{actionError}</p>}
      {success && <p role="status">{success}</p>}

      <section>
        <h2>My Activities</h2>

        {loading && <p>Loading activities…</p>}
        {error && <p role="alert">{error.message}</p>}
        {!loading && !error && activities.length === 0 && <p>No activities yet.</p>}

        {!error && activities.map((activity) => (
          <article key={activity.id}>
            <h3>{activity.title}</h3>
            <p>{activity.date} · {activity.time}–{activity.endTime} · {activity.location}</p>
            <p>{activity.status === 'cancelled' ? 'Cancelled' : 'Active'}</p>

            <ul>
              {activity.missions.map((mission) => {
                const spotsLeft = Math.max(0, mission.capacity - mission.registrations.length)

                return (
                  <li key={mission.id}>
                    {mission.name} · {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
                    <MissionVolunteers registrations={mission.registrations} />

                    {activity.status === 'active' && editingMissionId === mission.id && (
                      <form onSubmit={(event) => saveMission(event, activity.id, mission.id)}>
                        <fieldset disabled={busy}>
                          <legend>Edit mission</legend>
                          <MissionFields mission={mission} />
                          <button type="submit">Save Mission</button>
                          <button type="button" onClick={() => setEditingMissionId(null)}>
                            Close Editor
                          </button>
                        </fieldset>
                      </form>
                    )}

                    {activity.status === 'active' && !editorOpen && (
                      <div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setEditingMissionId(mission.id)}
                        >
                          Edit Mission
                        </button>
                        <button
                          type="button"
                          disabled={busy || activity.missions.length === 1}
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

            {activity.status === 'active' && !editorOpen && (
              <form onSubmit={(event) => saveMission(event, activity.id)}>
                <fieldset disabled={busy}>
                  <legend>Add a mission</legend>
                  <MissionFields />
                  <button type="submit">Add Mission</button>
                </fieldset>
              </form>
            )}

            {activity.status === 'active' && editingId === activity.id && (
              <form onSubmit={(event) => saveActivity(event, activity.id)}>
                <fieldset disabled={busy}>
                  <legend>Edit activity</legend>
                  <ActivityFields activity={activity} />
                  <button type="submit">Save Changes</button>
                  <button type="button" onClick={() => setEditingId(null)}>
                    Close Editor
                  </button>
                </fieldset>
              </form>
            )}

            {activity.status === 'active' && !editorOpen && (
              <div>
                <button type="button" disabled={busy} onClick={() => setEditingId(activity.id)}>
                  Edit
                </button>
                <button type="button" disabled={busy} onClick={() => cancelActivity(activity)}>
                  Cancel Activity
                </button>
              </div>
            )}

            <button type="button" disabled={busy} onClick={() => exportParticipants(activity)}>
              Export Participants CSV
            </button>
          </article>
        ))}
      </section>
    </main>
  )
}