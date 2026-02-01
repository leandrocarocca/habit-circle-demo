import { describe, it, expect, vi } from 'vitest';
import { POST, DELETE } from './route';

vi.mock('@/auth', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: '1' } })),
}));

vi.mock('@vercel/blob', () => ({
  put: vi.fn(() => Promise.resolve({ url: 'https://example.com/image.jpg' })),
  del: vi.fn(() => Promise.resolve()),
}));

describe('POST /api/upload', () => {
  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.jpg', { type: 'image/jpeg' }));

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if no file is provided', async () => {
    const formData = new FormData();

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('No file provided');
  });

  it('returns 400 if file type is invalid', async () => {
    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.txt', { type: 'text/plain' }));

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
  });
});

describe('DELETE /api/upload', () => {
  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/image.jpg' }),
    });
    const response = await DELETE(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if no URL is provided', async () => {
    const request = new Request('http://localhost:3000/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await DELETE(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('No URL provided');
  });
});
