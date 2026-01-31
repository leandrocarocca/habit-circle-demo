import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: '1' } })),
}));

vi.mock('@neondatabase/serverless', () => ({
  Pool: class {
    query = vi.fn();
  },
}));

describe('POST /api/meals/from-template', () => {
  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/meals/from-template', {
      method: 'POST',
      body: JSON.stringify({ template_id: 1, date: '2024-01-01' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if template_id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/meals/from-template', {
      method: 'POST',
      body: JSON.stringify({ date: '2024-01-01' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required fields: template_id, date');
  });

  it('returns 400 if date is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/meals/from-template', {
      method: 'POST',
      body: JSON.stringify({ template_id: 1 }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required fields: template_id, date');
  });
});
