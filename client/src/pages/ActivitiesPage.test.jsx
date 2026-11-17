import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi, beforeEach } from 'vitest';
import { ActivitiesPage } from './ActivitiesPage.jsx';

const list = [
  { id: 1, title: 'Library help', date: '2026-12-12', start_time: '14:00', end_time: '17:00', location: 'City Library', mission_count: 1 },
];

beforeEach(() => localStorage.clear());

it('lists activities and opens the details', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => list });
  const onOpen = vi.fn();
  render(<ActivitiesPage onOpenActivity={onOpen} />);

  await userEvent.click(await screen.findByRole('button', { name: 'View details' }));
  expect(onOpen).toHaveBeenCalledWith(1);
});

it('sends the date and location filters to the API', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => list });
  globalThis.fetch = fetchMock;
  render(<ActivitiesPage onOpenActivity={() => {}} />);
  await screen.findByText('Library help');

  await userEvent.type(screen.getByLabelText('Location'), 'library');
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));

  await vi.waitFor(() => {
    const urls = fetchMock.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.includes('location=library'))).toBe(true);
  });
});

it('shows the spots left for each mission (2/3)', async () => {
  const withMissions = [{
    ...list[0],
    missions: [{ id: 9, title: 'Shelving', spots_needed: 3, spots_left: 2 }],
  }];
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => withMissions });
  render(<ActivitiesPage onOpenActivity={() => {}} />);

  expect(await screen.findByText(/Shelving : 2\/3 spot\(s\) left/)).toBeInTheDocument();
});
