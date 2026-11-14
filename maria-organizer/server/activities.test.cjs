const test = require('node:test')
const assert = require('node:assert/strict')

test('rejects an activity when a mission has zero spots', async () => {
  const response = await fetch('http://127.0.0.1:3001/api/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Clean Day',
      date: '2027-08-25',
      time: '10:30',
      location: 'Markaz',
      description: 'Community cleanup',
      missions: [{ name: 'Welcome volunteers', capacity: 0 }],
    }),
  })

  assert.equal(response.status, 400)
})