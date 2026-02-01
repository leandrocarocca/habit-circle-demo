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

const createParams = (id: string) => Promise.resolve({ id });

describe('POST /api/meals/[id]/from-template', () => {
  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/meals/1/from-template', {
      method: 'POST',
      body: JSON.stringify({ template_id: 1 }),
    });
    const response = await POST(request, { params: createParams('1') });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if template_id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/meals/1/from-template', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: createParams('1') });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required field: template_id');
  });
});
