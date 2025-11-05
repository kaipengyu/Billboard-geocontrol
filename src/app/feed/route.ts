import { NextRequest, NextResponse } from 'next/server';

// You will need to set these in your .env.local file
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// Generate a real message using coordinates
async function generateMessage(latitude: number, longitude: number, locationName?: string) {
  try {
    // Fetch weather data
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=imperial`
    );
    
    if (!weatherRes.ok) {
      throw new Error('Failed to fetch weather');
    }

    const weatherData = await weatherRes.json();
    const temperature = Math.round(weatherData.main.temp);
    const weatherDescription = weatherData.weather[0].description;
    
    // Use provided locationName if available, otherwise use Weather API location
    const location = locationName || weatherData.name;

    // Generate message using OpenAI with weather and location context
    const prompt = `
You are a creative copywriter for an energy utility campaign.
Your job is to write short, witty, locally relevant messages using the input.
The goal is to make the message feel human, surprising, and specific to that location — not like a template.

Location: ${location}

IMPORTANT: 
- Your PRIMARY focus should be finding a fun, curious, or pop-culture fact about this place (historical, quirky, or tongue-in-cheek). DO NOT default to weather references.
- Write like a smart local with a sense of humor, not a corporate marketer. Prioritize wit, insight, or oddity over symmetry or sales tone. It's okay if the line feels a little weird — weird is human.
- DO NOT use or reference any sensitive, tragic, or controversial historical events or topics (e.g., war, slavery, colonialism, racism, natural disasters, or crimes). 
- Stick to light, amusing, or quirky local facts that are safe for a general audience (sports, food, pop culture, odd traditions, local inventions, etc.).
- If a place's history is primarily serious, skip history altogether and use a cultural or geographic quirk instead.

Using the location, infer or generate:
- The city and region
- A fun, curious, or pop-culture fact about that place (historical, quirky, or even tongue-in-cheek)
- Avoid mentioning weather unless it's iconic to the location or creates a truly clever connection
- Always include a natural or humorous transition that connects the local fact to the energy-efficiency message — use logic, irony, or observation to bridge them smoothly, not as two separate sentences.

Use that local detail as a non-sequitur or witty hook, then pivot naturally to an energy efficiency tip or rebate (e.g., insulation, smart thermostats, HVAC tune-ups, weather stripping, heat pumps, appliance recycling, etc.).

The message should be:
- 1–2 sentences total
- Clever, conversational, and human
- Focused on charm and wit over pure information
- Lightly persuasive, ending on a relatable energy-savings note
- DO NOT use any M-dashes (—) in the message

If no strong local fact is found:
- Use a regional or nearby city reference (e.g., "Northern California," "the Pacific Northwest," "the Midwest")
- OR use a general regional stereotype or tone cue (e.g., "rainy coast," "desert town," "mountain air")
- Keep the humor and connection intact — don't fall back to bland weather-based statements

Tone:
Observational, smart, and conversational — like a clever friend pointing something out about your town.
Avoid marketing clichés, rhymes, or obvious puns ("sizzle," "shine bright," "race to savings").
Humor should come from connection, contrast, or surprise, not wordplay.
The goal is to make the reader think, "Ha, that's actually true," not "Okay, cute line."
Your message should always be friendly and inclusive. 
If humor risks sounding dark, insensitive, or sarcastic about serious subjects, do not use it.

Style:
Lead with something real or believable about the location (local history, odd trivia, pop culture link, etc.).
Then pivot naturally into an energy efficiency message using tone, pacing, or logic — not a pun.
Keep it short and human: 1–2 sentences max.
The line should sound natural if read aloud, like something overheard on a local radio segment or between neighbors.

Examples (right tone):
"Buttonwillow's got more race tracks than stoplights — maybe time your HVAC slowed down for a pit stop."
"Bakersfield once claimed the title of country music capital. Guess that makes your old fridge a classic hit."
"Taft's oil days are long gone — but sealing up those leaks still pays off."
"Barstow's famous for its ghost towns. Don't let your energy bill become one."

Examples (wrong tone):
"Stay cool and save — upgrade today!"
"Where the sun shines bright, your savings can too."
"Race toward efficiency!"

(Context data - use sparingly: Weather is ${weatherDescription}, ${temperature}°F)

Output format:
Location: [City, State]  
Message: [Final 1–2 sentence witty copy line]

Before writing the final message, check whether your chosen local fact involves sensitive historical topics. 
If it does, discard it and select a different, harmless one. 
You must never mention or imply sensitive events or tragedies under any circumstances.`;

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
        temperature: 0.7 + Math.random() * 0.3, // Random temperature between 0.7-1.0 for variety
      }),
    });
    
    if (!aiRes.ok) {
      throw new Error('Failed to generate message');
    }

    const aiData = await aiRes.json();
    const messageRaw = aiData.choices?.[0]?.message?.content?.trim() || 'Have a wonderful day!';
    
    // Extract just the message part from the response format
    let message = messageRaw;
    const messageMatch = messageRaw.match(/Message:\s*([\s\S]+?)$/i);
    if (messageMatch) {
      message = messageMatch[1].trim();
    }
    
    // Clean up the message
    message = message.replace(/^['"]+|['"]+$/g, '');
    message = message.replace(/'/g, '\u2019');
    message = message.replace(/\s*—\s*/g, ', ');
    
    // Check for sensitive words
    const sensitiveWords = [
      'slavery', 'slave', 'civil war', 'massacre', 'segregation', 'protest', 'riot', 
      'disaster', 'hurricane', 'killed', 'destroyed', 'burned', 'bomb', 'war', 
      'shooting', 'tragedy', 'colonialism', 'colonial', 'colony', 'racism', 'sunset'
    ];
    
    const checkForSensitiveWords = (text: string) => {
      const lowerText = text.toLowerCase();
      // Normalize text: replace punctuation with spaces for word boundary matching
      const normalizedText = lowerText.replace(/[^\w\s]/g, ' ');
      
      return sensitiveWords.some(word => {
        const lowerWord = word.toLowerCase().trim();
        // First try word boundary match (for whole words)
        const escapedWord = lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundaryRegex = new RegExp(`\\b${escapedWord}\\b`, 'i');
        // Also check for substring match (handles multi-word phrases like "civil war")
        return wordBoundaryRegex.test(normalizedText) || lowerText.includes(lowerWord);
      });
    };
    
    if (checkForSensitiveWords(message)) {
      // Use fallback message if sensitive content detected
      throw new Error('Sensitive content detected');
    }
    
    return message;
  } catch (error) {
    console.error(`Error generating message:`, error);
    
    return `Welcome to ${locationName || 'your area'}! Discover local energy efficiency tips and rebates in your area.`;
  }
}

// This is the route handler for the /feed route
export async function GET(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (req.headers.get('host') ? `https://${req.headers.get('host')}` : 'http://localhost:3000');
    
    // Get location from query parameters
    const url = new URL(req.url);
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const locationName = url.searchParams.get('location');
    
    // If no coordinates provided, return an error message
    if (!lat || !lng) {
      const errorRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Smart Billboard Messages</title>
    <description>Location-based energy efficiency messages from the Smart Billboard system.</description>
    <link>${baseUrl}</link>
    <item>
      <title>Location Required</title>
      <description><![CDATA[Please provide latitude and longitude parameters to get location-specific messages. Use: /feed?lat=40.7128&lng=-74.0060]]></description>
      <link>${baseUrl}</link>
      <guid isPermaLink="true">${baseUrl}/feed?error=location-required</guid>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel>
</rss>`;

      return new NextResponse(errorRss, {
        status: 200,
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
        },
      });
    }
    
    // Generate message for the provided location
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const message = await generateMessage(latitude, longitude, locationName || undefined);
    const pubDate = new Date().toUTCString();
    
    // Get location name for display (either provided or we'll use a generic one)
    const displayLocation = locationName || `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

    const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Smart Billboard Message - ${displayLocation}</title>
    <description>Latest energy efficiency message from the Smart Billboard system for ${displayLocation}.</description>
    <link>${baseUrl}</link>
    <item>
      <title>Smart Billboard Message - ${displayLocation}</title>
      <description><![CDATA[${message}]]></description>
      <link>${baseUrl}?lat=${lat}&lng=${lng}</link>
      <guid isPermaLink="true">${baseUrl}/feed?lat=${lat}&lng=${lng}&t=${Date.now()}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>
  </channel>
</rss>`;

    return new NextResponse(rssContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute for more dynamic content
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new NextResponse('Error generating RSS feed', { status: 500 });
  }
}
