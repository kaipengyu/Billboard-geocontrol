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
    let locationName: string | undefined;
    
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
      locationName = body.locationName;
      
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
    
    // Use provided locationName if available, otherwise use Weather API location
    const location = locationName || weatherData.name;
    const temperature = Math.round(weatherData.main.temp);
    const weatherDescription = weatherData.weather[0].description;

    // Generate message using OpenAI with weather and location context
    const prompt = `
You are a creative copywriter for an energy utility campaign.
Your job is to write short, witty, locally relevant messages using the input.
The goal is to make the message feel human, surprising, and specific to that location — not like a template.

Location: ${location}

IMPORTANT: 
- Your PRIMARY focus should be finding a fun, curious, or pop-culture fact about this place (historical, quirky, or tongue-in-cheek). DO NOT default to weather references.
- Write like a smart local with a sense of humor, not a corporate marketer. Prioritize wit, insight, or oddity over symmetry or sales tone. It’s okay if the line feels a little weird — weird is human.
- DO NOT use or reference any sensitive, tragic, or controversial historical events or topics (e.g., war, slavery, colonialism, racism, natural disasters, or crimes). 
- Stick to light, amusing, or quirky local facts that are safe for a general audience (sports, food, pop culture, odd traditions, local inventions, etc.).
- If a place’s history is primarily serious, skip history altogether and use a cultural or geographic quirk instead.

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
Avoid marketing clichés, rhymes, or obvious puns (“sizzle,” “shine bright,” “race to savings”).
Humor should come from connection, contrast, or surprise, not wordplay.
The goal is to make the reader think, “Ha, that’s actually true,” not “Okay, cute line.”
Your message should always be friendly and inclusive. 
If humor risks sounding dark, insensitive, or sarcastic about serious subjects, do not use it.

Style:
Lead with something real or believable about the location (local history, odd trivia, pop culture link, etc.).
Then pivot naturally into an energy efficiency message using tone, pacing, or logic — not a pun.
Keep it short and human: 1–2 sentences max.
The line should sound natural if read aloud, like something overheard on a local radio segment or between neighbors.

Examples (right tone):
“Buttonwillow’s got more race tracks than stoplights — maybe time your HVAC slowed down for a pit stop.”
“Bakersfield once claimed the title of country music capital. Guess that makes your old fridge a classic hit.”
“Taft’s oil days are long gone — but sealing up those leaks still pays off.”
“Barstow’s famous for its ghost towns. Don’t let your energy bill become one.”

Examples (wrong tone):
“Stay cool and save — upgrade today!”
“Where the sun shines bright, your savings can too.”
“Race toward efficiency!”

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
    // Replace M-dashes (em dashes) with commas, ensuring proper spacing
    message = message.replace(/\s*—\s*/g, ', ');
    
    // Hard rule: Reject if includes sensitive words and auto-regenerate, test if it works
    const sensitiveWords = [
      'slavery', 'slave', 'civil war', 'massacre', 'segregation', 'protest', 'riot', 
      'disaster', 'hurricane', 'killed', 'destroyed', 'burned', 'bomb', 'war', 
      'shooting', 'tragedy'
    ];
    
    const checkForSensitiveWords = (text: string) => {
      return sensitiveWords.some(word => text.toLowerCase().includes(word.toLowerCase()));
    };
    
    const formatMessage = (rawMessage: string) => {
      let formatted = rawMessage;
      const messageMatch = rawMessage.match(/Message:\s*([\s\S]+?)$/i);
      if (messageMatch) {
        formatted = messageMatch[1].trim();
      }
      formatted = formatted.replace(/^['"]+|['"]+$/g, '');
      formatted = formatted.replace(/'/g, '\u2019');
      formatted = formatted.replace(/\s*—\s*/g, ', ');
      return formatted;
    };
    
    // Check initial message and retry if needed (max 3 attempts total)
    let attempts = 1;
    const maxAttempts = 3;
    
    while (checkForSensitiveWords(message) && attempts < maxAttempts) {
      attempts++;
      const retryPrompt = prompt + `\n\nIMPORTANT: The previous response contained sensitive content. This is attempt ${attempts} of ${maxAttempts}. Generate a completely different message that avoids any sensitive topics.`;
      
      const retryRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: retryPrompt }],
          max_tokens: 80,
          temperature: 0.7 + (attempts * 0.1), // Vary temperature for different seeds
        }),
      });
      
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        const retryMessageRaw = retryData.choices?.[0]?.message?.content?.trim() || 'Have a wonderful day!';
        message = formatMessage(retryMessageRaw);
      } else {
        // If retry fails, break out of loop and use current message
        break;
      }
    }
    
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error in generate-message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 