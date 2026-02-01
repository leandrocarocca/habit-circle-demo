import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';

vi.mock('@/auth', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: '1' } })),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: vi.fn(() =>
        Promise.resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                calories_per_100g: 250,
                protein_per_100g: 20,
                fat_per_100g: 10,
                carbs_per_100g: 15,
                sugar_per_100g: 5,
                name: 'Test Product',
                brand: 'Test Brand',
              }),
            },
          ],
        })
      ),
    };
  },
}));

describe('POST /api/analyze-nutrition', () => {
  it('returns 401 if user is not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    const request = new Request('http://localhost:3000/api/analyze-nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: 'https://example.com/image.jpg' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if no image is provided', async () => {
    const request = new Request('http://localhost:3000/api/analyze-nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Either image_url or image_base64 is required');
  });

  it('returns nutrition data when given a valid image', async () => {
    const request = new Request('http://localhost:3000/api/analyze-nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: 'https://example.com/nutrition-label.jpg' }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.calories_per_100g).toBe(250);
    expect(data.protein_per_100g).toBe(20);
    expect(data.fat_per_100g).toBe(10);
    expect(data.carbs_per_100g).toBe(15);
    expect(data.sugar_per_100g).toBe(5);
    expect(data.name).toBe('Test Product');
    expect(data.brand).toBe('Test Brand');
  });
});
