import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@neondatabase/serverless', () => ({
  Pool: class {
    query = vi.fn();
  },
}));

describe('POST /api/meals/[id]/food-items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/meals/1/food-items', {
      method: 'POST',
      body: JSON.stringify({
        food_item_id: 1,
        portion_type: 'per_portion',
        portion_count: 1,
      }),
    });
    const params = Promise.resolve({ id: '1' });
    const response = await POST(request, { params });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if required fields are missing', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue({
      user: { id: '1', name: 'Test', email: 'test@test.com' },
      expires: '2024-12-31',
    });

    const request = new NextRequest('http://localhost:3000/api/meals/1/food-items', {
      method: 'POST',
      body: JSON.stringify({
        food_item_id: 1,
        // missing portion_type and portion_count
      }),
    });
    const params = Promise.resolve({ id: '1' });
    const response = await POST(request, { params });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required fields: food_item_id, portion_type, portion_count');
  });

  it('returns 400 if portion_type is invalid', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue({
      user: { id: '1', name: 'Test', email: 'test@test.com' },
      expires: '2024-12-31',
    });

    const request = new NextRequest('http://localhost:3000/api/meals/1/food-items', {
      method: 'POST',
      body: JSON.stringify({
        food_item_id: 1,
        portion_type: 'invalid_type',
        portion_count: 1,
      }),
    });
    const params = Promise.resolve({ id: '1' });
    const response = await POST(request, { params });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid portion_type');
  });
});
