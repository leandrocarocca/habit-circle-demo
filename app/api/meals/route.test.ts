import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@neondatabase/serverless', () => ({
  Pool: class {
    query = vi.fn();
  },
}));

describe('GET /api/meals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/meals?date=2024-01-01');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if date parameter is missing', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue({
      user: { id: '1', name: 'Test', email: 'test@test.com' },
      expires: '2024-12-31',
    });

    const request = new NextRequest('http://localhost:3000/api/meals');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required parameter: date');
  });
});

describe('POST /api/meals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/meals', {
      method: 'POST',
      body: JSON.stringify({ date: '2024-01-01', name: 'Breakfast' }),
    });
    const response = await POST(request);

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

    const request = new NextRequest('http://localhost:3000/api/meals', {
      method: 'POST',
      body: JSON.stringify({ date: '2024-01-01' }), // missing name
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required fields: date and name');
  });
});
