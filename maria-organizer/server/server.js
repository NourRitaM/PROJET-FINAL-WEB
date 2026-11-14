const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

const activities = []
let nextId = 1
let nextMissionId = 1

app.post('/api/activities', (req, res) => {
  const { title, date, time, location, description, missions } = req.body ?? {}

  const activityFields = [title, date, time, location, description]
  const hasAllFields = activityFields.every(
    (value) => typeof value === 'string' && value.trim() !== ''
  )

  if (!hasAllFields) {
    return res.status(400).json({
      message: 'Fill in all activity fields.',
    })
  }

  const hasValidMissions =
    Array.isArray(missions) &&
    missions.length > 0 &&
    missions.every(
      (mission) =>
        typeof mission?.name === 'string' &&
        mission.name.trim() !== '' &&
        Number.isInteger(mission.capacity) &&
        mission.capacity >= 1
    )

  if (!hasValidMissions) {
    return res.status(400).json({
      message: 'Add at least one mission. Each mission needs a name and at least one spot.',
    })
  }

  const activity = {
    id: nextId++,
    title: title.trim(),
    date,
    time,
    location: location.trim(),
    description: description.trim(),
    status: 'active',
    missions: missions.map(({ name, capacity }) => ({
      id: nextMissionId++,
      name: name.trim(),
      capacity,
    })),
  }

  activities.push(activity)
  return res.status(201).json(activity)
})

app.patch('/api/activities/:activityId', (req, res) => {
  const activityId = Number(req.params.activityId)
  const activity = activities.find((item) => item.id === activityId)

  if (!activity) {
    return res.status(404).json({ message: 'Activity not found.' })
  }

  const { title, date, time, location, description, status } = req.body ?? {}
  const updates = { title, date, time, location, description }
  const changes = Object.entries(updates).filter(
    ([, value]) => value !== undefined
  )

  if (changes.length === 0 && status === undefined) {
    return res.status(400).json({ message: 'Provide at least one field to update.' })
  }

  for (const [field, value] of changes) {
    if (typeof value !== 'string' || value.trim() === '') {
      return res.status(400).json({ message: `The ${field} field is invalid.` })
    }
  }

  if (status !== undefined && status !== 'cancelled') {
    return res.status(400).json({ message: 'Invalid activity status.' })
  }

  for (const [field, value] of changes) {
    activity[field] = value.trim()
  }

  if (status === 'cancelled') {
    activity.status = 'cancelled'
  }

  return res.json(activity)
})

app.use('/api/activities/:activityId/missions', (req, res, next) => {
  const activity = activities.find(
    (item) => item.id === Number(req.params.activityId)
  )

  if (!activity) {
    return res.status(404).json({ message: 'Activity not found.' })
  }

  if (activity.status === 'cancelled') {
    return res.status(409).json({ message: 'This activity has been cancelled.' })
  }

  req.activity = activity
  next()
})

function validMission(name, capacity) {
  return (
    typeof name === 'string' &&
    name.trim() !== '' &&
    Number.isInteger(capacity) &&
    capacity >= 1
  )
}

app.post('/api/activities/:activityId/missions', (req, res) => {
  const { name, capacity } = req.body ?? {}

  if (!validMission(name, capacity)) {
    return res.status(400).json({
      message: 'Enter a mission name and a whole number of spots (at least 1).',
    })
  }

  const mission = { id: nextMissionId++, name: name.trim(), capacity }
  req.activity.missions.push(mission)
  return res.status(201).json(mission)
})

app.patch('/api/activities/:activityId/missions/:missionId', (req, res) => {
  const mission = req.activity.missions.find(
    (item) => item.id === Number(req.params.missionId)
  )

  if (!mission) {
    return res.status(404).json({ message: 'Mission not found.' })
  }

  const { name, capacity } = req.body ?? {}

  if (name === undefined && capacity === undefined) {
    return res.status(400).json({
      message: 'Provide a mission name or number of spots to update.',
    })
  }

  const updatedName = name === undefined ? mission.name : name
  const updatedCapacity = capacity === undefined ? mission.capacity : capacity

  if (!validMission(updatedName, updatedCapacity)) {
    return res.status(400).json({
      message: 'Enter a mission name and a whole number of spots (at least 1).',
    })
  }

  mission.name = updatedName.trim()
  mission.capacity = updatedCapacity
  return res.json(mission)
})

app.delete('/api/activities/:activityId/missions/:missionId', (req, res) => {
  const missions = req.activity.missions
  const index = missions.findIndex(
    (item) => item.id === Number(req.params.missionId)
  )

  if (index === -1) {
    return res.status(404).json({ message: 'Mission not found.' })
  }

  if (missions.length === 1) {
    return res.status(409).json({
      message: 'An activity must have at least one mission.',
    })
  }

  missions.splice(index, 1)
  return res.status(204).end()
})

app.get('/api/organizer/activities', (req, res) => {
  const result = activities.map((activity) => ({
    ...activity,
    missions: activity.missions.map((mission) => ({
      ...mission,
      registrations: [],
    })),
  }))

  return res.json(result)
})

app.listen(3001, '127.0.0.1', () => {
  console.log('Organizer server running at http://127.0.0.1:3001')
})