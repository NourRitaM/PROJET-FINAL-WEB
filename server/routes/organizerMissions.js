import { Router } from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

const router = Router()
const maxInteger = 2147483647
const missionsPath = '/activities/:activityId/missions'

function isValidId(id) {
  return Number.isInteger(id) && id >= 1 && id <= maxInteger
}

function validateMission({ name, capacity }) {
  return (
    typeof name === 'string' &&
    name.trim() !== '' &&
    Number.isInteger(capacity) &&
    capacity >= 1 &&
    capacity <= maxInteger
  )
}

function changeMissions(operation) {
  return async (req, res) => {
    const activityId = Number(req.params.activityId)
    const missionId = Number(req.params.missionId)

    if (!isValidId(activityId)) {
      return res.status(404).json({ error: 'Activity not found.' })
    }

    if (operation !== 'add' && !isValidId(missionId)) {
      return res.status(404).json({ error: 'Mission not found.' })
    }

    const input = req.body ?? {}

    if (operation !== 'remove' && !validateMission(input)) {
      return res.status(400).json({
        error: 'Enter a mission name and a valid whole number of spots.',
      })
    }

    const db = await pool.connect()

    try {
      await db.query('BEGIN')

      const { rows: [activity] } = await db.query(
        `SELECT status FROM activities
         WHERE id = $1 AND organizer_id = $2
         FOR UPDATE`,
        [activityId, req.userId]
      )

      if (!activity || activity.status !== 'open') {
        await db.query('ROLLBACK')
        return res.status(404).json({ error: 'Active activity not found.' })
      }

      if (operation === 'add') {
        const { rows: [mission] } = await db.query(
          `INSERT INTO missions (activity_id, title, spots_needed)
           VALUES ($1, $2, $3)
           RETURNING id, title AS name, spots_needed AS capacity`,
          [activityId, input.name.trim(), input.capacity]
        )

        await db.query('COMMIT')
        return res.status(201).json({ ...mission, registrations: [] })
      }

      const { rowCount } = await db.query(
        `SELECT id FROM missions
         WHERE id = $1 AND activity_id = $2
         FOR UPDATE`,
        [missionId, activityId]
      )

      if (rowCount === 0) {
        await db.query('ROLLBACK')
        return res.status(404).json({ error: 'Mission not found.' })
      }

      const { rows: [counts] } = await db.query(
        `SELECT
           count(*)::int AS total,
           (count(*) FILTER (WHERE status = 'confirmed'))::int AS confirmed
         FROM registrations
         WHERE mission_id = $1`,
        [missionId]
      )

      if (operation === 'edit') {
        if (input.capacity < counts.confirmed) {
          await db.query('ROLLBACK')
          return res.status(409).json({
            error: 'Capacity cannot be lower than the number of confirmed volunteers.',
          })
        }

        await db.query(
          'UPDATE missions SET title = $2, spots_needed = $3 WHERE id = $1',
          [missionId, input.name.trim(), input.capacity]
        )
      } else {
        const { rows: [result] } = await db.query(
          'SELECT count(*)::int AS total FROM missions WHERE activity_id = $1',
          [activityId]
        )

        if (counts.total > 0 || result.total <= 1) {
          await db.query('ROLLBACK')
          return res.status(409).json({
            error: counts.total > 0
              ? 'A mission with registrations cannot be removed.'
              : 'An activity must have at least one mission.',
          })
        }

        await db.query('DELETE FROM missions WHERE id = $1', [missionId])
      }

      await db.query('COMMIT')
      return res.status(204).end()
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    } finally {
      db.release()
    }
  }
}

router.post(missionsPath, requireAuth, requireRole('organizer'), changeMissions('add'))
router.patch(`${missionsPath}/:missionId`, requireAuth, requireRole('organizer'), changeMissions('edit'))
router.delete(`${missionsPath}/:missionId`, requireAuth, requireRole('organizer'), changeMissions('remove'))

export default router