import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@neondatabase/serverless', () => ({
  Pool: class {
    query = vi.fn();
  },
}));

describe('DELETE /api/meals/[id]/food-items/[foodItemId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/meals/1/food-items/1', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: '1', foodItemId: '1' });
    const response = await DELETE(request, { params });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });
});
