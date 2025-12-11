import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT, DELETE } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@neondatabase/serverless', () => ({
  Pool: class {
    query = vi.fn();
  },
}));

describe('PUT /api/meals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/meals/1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Meal' }),
    });
    const params = Promise.resolve({ id: '1' });
    const response = await PUT(request, { params });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if name is missing', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue({
      user: { id: '1', name: 'Test', email: 'test@test.com' },
      expires: '2024-12-31',
    });

    const request = new NextRequest('http://localhost:3000/api/meals/1', {
      method: 'PUT',
      body: JSON.stringify({}), // missing name
    });
    const params = Promise.resolve({ id: '1' });
    const response = await PUT(request, { params });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required field: name');
  });
});

describe('DELETE /api/meals/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/meals/1', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: '1' });
    const response = await DELETE(request, { params });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });
});
