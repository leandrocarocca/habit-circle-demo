import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image_url, image_base64, media_type } = await request.json();

    if (!image_url && !image_base64) {
      return NextResponse.json(
        { error: 'Either image_url or image_base64 is required' },
        { status: 400 }
      );
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const imageContent: Anthropic.ImageBlockParam = image_base64
      ? {
          type: 'image',
          source: {
            type: 'base64',
            media_type: media_type || 'image/jpeg',
            data: image_base64,
          },
        }
      : {
          type: 'image',
          source: {
            type: 'url',
            url: image_url,
          },
        };

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            imageContent,
            {
              type: 'text',
              text: `Analyze this nutrition label image and extract the nutritional information PER 100g (or per 100ml for liquids).

IMPORTANT: The values MUST be per 100g/100ml. If the label shows values per serving, you need to calculate the per-100g values using the serving size.

Return ONLY a valid JSON object with these fields (use numbers, not strings):
{
  "calories_per_100g": <number>,
  "protein_per_100g": <number>,
  "fat_per_100g": <number>,
  "carbs_per_100g": <number>,
  "sugar_per_100g": <number>,
  "name": "<product name if visible, otherwise null>",
  "brand": "<brand name if visible, otherwise null>"
}

If you cannot read a specific value, use null for that field.
If this is not a nutrition label or the image is unreadable, return: {"error": "Could not read nutrition label"}`,
            },
          ],
        },
      ],
    });

    // Extract the text content from the response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'Failed to analyze image' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    const responseText = textContent.text.trim();

    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const nutritionData = JSON.parse(jsonStr);

      if (nutritionData.error) {
        return NextResponse.json(
          { error: nutritionData.error },
          { status: 400 }
        );
      }

      return NextResponse.json(nutritionData);
    } catch {
      console.error('Failed to parse nutrition data:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse nutrition information from image' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error analyzing nutrition label:', error);
    return NextResponse.json(
      { error: 'Failed to analyze nutrition label' },
      { status: 500 }
    );
  }
}
