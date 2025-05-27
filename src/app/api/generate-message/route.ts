import { NextRequest, NextResponse } from 'next/server';

// You will need to set these in your .env.local file
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude } = await req.json();
    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Missing latitude or longitude' }, { status: 400 });
    }

    // Fetch weather data
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`
    );
    const weatherData = await weatherRes.json();
    if (!weatherRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
    }

    const location = weatherData.name;
    const weather = weatherData.weather?.[0]?.description || 'unknown weather';
    const temp = weatherData.main?.temp;

    // Generate message using OpenAI
    const prompt = `You are a smart billboard. Create a catchy, friendly sentence for people passing by, using this info: location: ${location}, weather: ${weather}, temperature: ${temp}°C.`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60,
      }),
    });
    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 });
    }

    const message = aiData.choices?.[0]?.message?.content?.trim() || 'Welcome!';
    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 