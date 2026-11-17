import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { apiFetch } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { OrganizerPage } from './OrganizerPage.jsx';

vi.mock('../api/client.js', () => ({ apiFetch: vi.fn() }));
vi.mock('../hooks/useApi.js', () => ({ useApi: vi.fn() }));

const activity = {
  id: 8,
  title: 'Beach cleanup',
  date: '2026-07-12',
  time: '09:00',
  endTime: '12:00',
  location: 'Beirut',
  status: 'active',
  missions: [{
    id: 12,
    name: 'Collect litter',
    capacity: 4,
    registrations: [],
  }],
};

beforeEach(() => {
  vi.clearAllMocks();
  useApi.mockReturnValue({ data: [activity], loading: false, error: null, reload: vi.fn() });
});

it('offers separate create-activity and my-activities destinations', async () => {
  const onNavigate = vi.fn();
  render(<OrganizerPage onNavigate={onNavigate} />);

  await userEvent.click(screen.getByRole('button', { name: 'Create an Activity' }));
  await userEvent.click(screen.getByRole('button', { name: 'My Activities' }));

  expect(onNavigate).toHaveBeenNthCalledWith(1, 'organizer-create');
  expect(onNavigate).toHaveBeenNthCalledWith(2, 'organizer-activities');
});

it('shows add-mission fields only after the organizer opens the action', async () => {
  apiFetch.mockResolvedValue({});
  render(<OrganizerPage page="organizer-activities" />);

  expect(screen.queryByLabelText('Mission name')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Add a mission' }));
  expect(screen.getByLabelText('Mission name')).toBeInTheDocument();
  expect(screen.getByLabelText('Number of spots')).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText('Mission name'), 'Welcome volunteers');
  await userEvent.clear(screen.getByLabelText('Number of spots'));
  await userEvent.type(screen.getByLabelText('Number of spots'), '6');
  await userEvent.click(screen.getByRole('button', { name: 'Add Mission' }));

  expect(apiFetch).toHaveBeenCalledWith('/api/organizer/activities/8/missions', {
    method: 'POST',
    body: JSON.stringify({ name: 'Welcome volunteers', capacity: 6 }),
  });
  expect(await screen.findByRole('status')).toHaveTextContent('Mission added: Welcome volunteers');
});
