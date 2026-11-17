// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'
import ActivityForm from './ActivityForm'

afterEach(cleanup)

test('adds a second mission when Add mission is clicked', async () => {
  const user = userEvent.setup()
  render(<ActivityForm />)

  expect(screen.getAllByLabelText('Mission name')).toHaveLength(1)

  await user.click(screen.getByRole('button', { name: 'Add mission' }))

  expect(screen.getAllByLabelText('Mission name')).toHaveLength(2)
})