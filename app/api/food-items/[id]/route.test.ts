import { describe, it, expect, vi } from 'vitest';
import { GET, PUT, DELETE } from './route';

vi.mock('@/auth', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: '1' } })),
}));

vi.mock('@neondatabase/serverless', () => ({
  Pool: class {
    query = vi.fn();
  },
}));

describe('Food Item API - GET by ID', () => {
  it('should return 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new Request('http://localhost:3000/api/food-items/1');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});

describe('Food Item API - PUT', () => {
  it('should return 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new Request('http://localhost:3000/api/food-items/1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Test', category: 'protein' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if required fields are missing', async () => {
    const request = new Request('http://localhost:3000/api/food-items/1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Test' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 if category is invalid', async () => {
    const request = new Request('http://localhost:3000/api/food-items/1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Test', category: 'invalid_category' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid category');
  });
});

describe('Food Item API - DELETE', () => {
  it('should return 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new Request('http://localhost:3000/api/food-items/1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});
