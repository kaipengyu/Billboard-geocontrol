import { NextRequest, NextResponse } from 'next/server';

// You will need to set these in your .env.local file
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// Predefined location coordinates
const predefinedLocations: Record<string, { latitude: number; longitude: number }> = {
  'nyc': { latitude: 40.7128, longitude: -74.0060 },
  'sf': { latitude: 37.7749, longitude: -122.4194 },
  'baltimore': { latitude: 39.2904, longitude: -76.6122 }
};

export async function POST(req: NextRequest) {
  try {
    // Check for location parameter in URL
    const url = new URL(req.url);
    const locationParam = url.searchParams.get('location');
    
    let latitude: number;
    let longitude: number;
    
    if (locationParam && predefinedLocations[locationParam.toLowerCase()]) {
      // Use predefined location coordinates
      const coords = predefinedLocations[locationParam.toLowerCase()];
      latitude = coords.latitude;
      longitude = coords.longitude;
    } else {
      // Use coordinates from request body
      const body = await req.json();
      latitude = body.latitude;
      longitude = body.longitude;
      
      if (!latitude || !longitude) {
        return NextResponse.json({ error: 'Missing latitude or longitude' }, { status: 400 });
      }
    }

    // Fetch weather data
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=imperial`
    );
    
    if (!weatherRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 });
    }

    const weatherData = await weatherRes.json();
    const location = weatherData.name;
    const temperature = Math.round(weatherData.main.temp);
    const weatherDescription = weatherData.weather[0].description;
    const feelsLike = Math.round(weatherData.main.feels_like);
    const humidity = weatherData.main.humidity;

    // Generate message using OpenAI with weather and location context
    const prompt = `You are a creative copywriter for an energy utility campaign.
Your job is to write short, witty, locally relevant messages using the input.
The goal is to make the message feel human, surprising, and specific to that location — not like a template.

Location: ${location}
Weather: ${weatherDescription}, ${temperature}°F (feels like ${feelsLike}°F), ${humidity}% humidity

Using the location, infer or generate:
- The city and region
- A fun, curious, or pop-culture fact about that place (historical, quirky, or even tongue-in-cheek)
- Optionally reference current weather or air quality, only if it fits naturally

Use that local detail as a non-sequitur or witty hook, then pivot naturally to an energy efficiency tip or rebate (e.g., insulation, smart thermostats, HVAC tune-ups, weather stripping, heat pumps, appliance recycling, etc.).

The message should be:
- 1–2 sentences total
- Clever, conversational, and human
- Focused on charm and wit over pure information
- Lightly persuasive, ending on a relatable energy-savings note

If no strong local fact is found:
- Use a regional or nearby city reference (e.g., "Northern California," "the Pacific Northwest," "the Midwest")
- OR use a general regional stereotype or tone cue (e.g., "rainy coast," "desert town," "mountain air")
- Keep the humor and connection intact — don't fall back to bland weather-based statements

Examples:
"Your town invented the hula hoop — maybe it's time your thermostat learned a new trick too."
"Turns out Barstow has more ghost towns than Starbucks — stop haunting that old water heater and upgrade to an efficient one."
"The world's biggest thermometer is in Baker. A smart thermostat could drop your summer bill by 10%."
"James Dean filmed his last movie near Cholame — don't let your energy bill go out in a blaze of glory."
"In the Pacific Northwest, even your rain jacket needs a jacket. Insulate before winter hits."

Output format:
Location: [City, State]  
Message: [Final 1–2 sentence witty copy line]`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0.8,
      }),
    });
    
    if (!aiRes.ok) {
      return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const messageRaw = aiData.choices?.[0]?.message?.content?.trim() || 'Have a wonderful day!';
    
    // Extract just the message part from the response format
    // Expected format: "Location: [City, State]\nMessage: [message text]"
    let message = messageRaw;
    const messageMatch = messageRaw.match(/Message:\s*([\s\S]+?)$/i);
    if (messageMatch) {
      message = messageMatch[1].trim();
    }
    
    // Remove leading/trailing quotes (single or double)
    message = message.replace(/^['"]+|['"]+$/g, '');
    // Replace all straight single quotes with curly right single quote
    message = message.replace(/'/g, '\u2019');
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error in generate-message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 