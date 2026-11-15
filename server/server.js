import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { pool } from './db/pool.js'
import authRouter from './routes/auth.js'
import organizerRouter from './routes/organizer.js'
import organizerMissionsRouter from './routes/organizerMissions.js'
import { requireAuth } from './middleware/requireAuth.js'
import { requireRole } from './middleware/requireRole.js'

for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in .env`)
    process.exit(1)
  }
}

const port = Number(process.env.PORT) || 3000
const app = express()

function logger(req, res, next) {
  const time = new Date().toLocaleTimeString()
  console.log(`${time} ${req.method} ${req.path}`)
  next()
}

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())
app.use(logger)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/auth', authRouter)
app.use('/api/organizer', organizerMissionsRouter)
app.use('/api/organizer', organizerRouter)

app.get('/api/demo/organizer', requireAuth, requireRole('organizer'), (req, res) => {
  res.json({ message: 'Hello organizer', userId: req.userId })
})

app.get('/api/demo/volunteer', requireAuth, requireRole('volunteer'), (req, res) => {
  res.json({ message: 'Hello volunteer', userId: req.userId })
})

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.use((err, req, res, next) => {
  if (err.status === 400 || err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' })
  }

  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

try {
  await pool.query('SELECT 1')
  console.log('connected to PostgreSQL')
  app.listen(port, () => console.log(`Listening on http://localhost:${port}`))
} catch (err) {
  console.error('DB connection failed:', err.message)
  process.exit(1)
}