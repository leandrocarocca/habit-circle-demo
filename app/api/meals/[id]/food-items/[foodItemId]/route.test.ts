import { describe, it, expect, vi } from 'vitest';
import { PUT, DELETE } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: '1' } })),
}));

vi.mock('@neondatabase/serverless', () => ({
  Pool: class {
    query = vi.fn();
  },
}));

const createParams = (id: string, foodItemId: string) =>
  Promise.resolve({ id, foodItemId });

describe('PUT /api/meals/[id]/food-items/[foodItemId]', () => {
  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/meals/1/food-items/1', {
      method: 'PUT',
      body: JSON.stringify({ portion_type: 'per_portion', portion_count: 2 }),
    });
    const response = await PUT(request, { params: createParams('1', '1') });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if portion_type is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/meals/1/food-items/1', {
      method: 'PUT',
      body: JSON.stringify({ portion_count: 2 }),
    });
    const response = await PUT(request, { params: createParams('1', '1') });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required fields: portion_type, portion_count');
  });

  it('returns 400 if portion_count is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/meals/1/food-items/1', {
      method: 'PUT',
      body: JSON.stringify({ portion_type: 'per_portion' }),
    });
    const response = await PUT(request, { params: createParams('1', '1') });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required fields: portion_type, portion_count');
  });

  it('returns 400 if portion_type is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/meals/1/food-items/1', {
      method: 'PUT',
      body: JSON.stringify({ portion_type: 'invalid_type', portion_count: 2 }),
    });
    const response = await PUT(request, { params: createParams('1', '1') });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid portion_type');
  });
});

describe('DELETE /api/meals/[id]/food-items/[foodItemId]', () => {
  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/meals/1/food-items/1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: createParams('1', '1') });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });
});
