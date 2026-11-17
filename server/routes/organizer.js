import { Router } from 'express'
import { pool, query } from '../db/pool.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { notifyActivityCancelled } from '../email/notifications.js'

const router = Router()
const maxInteger = 2147483647

router.use(requireAuth, requireRole('organizer'))

function hasText(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function validateActivity({ title, description, date, time, endTime, location }) {
  if (![title, description, location].every(hasText) || !isValidDate(date)) {
    return 'Enter a title, description, location, and valid date.'
  }

  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/
  if (
    typeof time !== 'string' ||
    typeof endTime !== 'string' ||
    !timePattern.test(time) ||
    !timePattern.test(endTime) ||
    endTime <= time
  ) {
    return 'End time must be later than start time.'
  }

  return null
}

router.get('/activities', async (req, res) => {
  const { rows } = await query(
    `
    SELECT
      a.id, a.title, a.description, a.location,
      to_char(a.date, 'YYYY-MM-DD') AS date,
      to_char(a.start_time, 'HH24:MI') AS time,
      to_char(a.end_time, 'HH24:MI') AS "endTime",
      CASE WHEN a.status = 'open' THEN 'active' ELSE a.status END AS status,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', m.id,
              'name', m.title,
              'capacity', m.spots_needed,
              'registrations', COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', u.id, 'name', u.name, 'username', u.username,
                      'email', u.email, 'phone', u.phone
                    )
                    ORDER BY u.name, u.id
                  )
                  FROM registrations r
                  JOIN users u ON u.id = r.user_id
                  WHERE r.mission_id = m.id AND r.status = 'confirmed'
                ),
                '[]'::json
              )
            )
            ORDER BY m.id
          )
          FROM missions m
          WHERE m.activity_id = a.id
        ),
        '[]'::json
      ) AS missions
    FROM activities a
    WHERE a.organizer_id = $1
    ORDER BY a.date, a.start_time, a.id
    `,
    [req.userId]
  )

  return res.json(rows)
})

router.post('/activities', async (req, res) => {
  const activityInput = req.body ?? {}
  const validationError = validateActivity(activityInput)

  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  const { title, description, date, time, endTime, location, missions } = activityInput

  if (
    !Array.isArray(missions) ||
    missions.length === 0 ||
    !missions.every((mission) =>
      hasText(mission?.name) &&
      Number.isInteger(mission.capacity) &&
      mission.capacity >= 1 &&
      mission.capacity <= maxInteger
    )
  ) {
    return res.status(400).json({
      error: 'Add at least one mission. Each mission needs a name and a valid number of spots.',
    })
  }

  const db = await pool.connect()

  try {
    await db.query('BEGIN')

    const { rows: [activity] } = await db.query(
      `
      INSERT INTO activities (
        organizer_id, title, description, date, start_time, end_time, location
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id, title, description, location,
        to_char(date, 'YYYY-MM-DD') AS date,
        to_char(start_time, 'HH24:MI') AS time,
        to_char(end_time, 'HH24:MI') AS "endTime"
      `,
      [req.userId, title.trim(), description.trim(), date, time, endTime, location.trim()]
    )

    const createdMissions = []

    for (const mission of missions) {
      const { rows: [createdMission] } = await db.query(
        `
        INSERT INTO missions (activity_id, title, spots_needed)
        VALUES ($1, $2, $3)
        RETURNING id, title AS name, spots_needed AS capacity
        `,
        [activity.id, mission.name.trim(), mission.capacity]
      )

      createdMissions.push({ ...createdMission, registrations: [] })
    }

    await db.query('COMMIT')

    return res.status(201).json({
      ...activity,
      status: 'active',
      missions: createdMissions,
    })
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  } finally {
    db.release()
  }
})

router.patch('/activities/:activityId', async (req, res) => {
  const id = Number(req.params.activityId)
  if (!Number.isInteger(id) || id < 1 || id > maxInteger) {
    return res.status(404).json({ error: 'Activity not found.' })
  }

  const changes = req.body ?? {}

  if (changes.status !== undefined) {
    if (changes.status !== 'cancelled') {
      return res.status(400).json({ error: 'Invalid activity status.' })
    }

    const result = await query(
      `
      UPDATE activities
      SET status = 'cancelled'
      WHERE id = $1 AND organizer_id = $2 AND status = 'open'
      `,
      [id, req.userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Activity not found.' })
    }

    // Prevenir les benevoles inscrits : sans await, la reponse n'attend pas les emails
    notifyActivityCancelled(id).catch((err) => console.error('[email]', err.message))

    return res.status(204).end()
  }

  const validationError = validateActivity(changes)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  const { title, description, date, time, endTime, location } = changes
  const result = await query(
    `
    UPDATE activities
    SET title = $3, description = $4, date = $5,
        start_time = $6, end_time = $7, location = $8
    WHERE id = $1 AND organizer_id = $2 AND status = 'open'
    `,
    [id, req.userId, title.trim(), description.trim(), date, time, endTime, location.trim()]
  )

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Active activity not found.' })
  }

  return res.status(204).end()
})

export default router