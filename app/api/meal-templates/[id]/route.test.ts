import { describe, it, expect, vi } from 'vitest';
import { GET, PUT, DELETE } from './route';
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

describe('GET /api/meal-templates/[id]', () => {
  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/meal-templates/1');
    const response = await GET(request, { params: createParams('1') });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });
});

describe('PUT /api/meal-templates/[id]', () => {
  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/meal-templates/1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Name' }),
    });
    const response = await PUT(request, { params: createParams('1') });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/meal-templates/1', {
      method: 'PUT',
      body: JSON.stringify({}),
    });
    const response = await PUT(request, { params: createParams('1') });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required field: name');
  });
});

describe('DELETE /api/meal-templates/[id]', () => {
  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/meal-templates/1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: createParams('1') });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });
});
