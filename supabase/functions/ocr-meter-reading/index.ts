import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-version, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured", reading: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl", reading: null }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch image", reading: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Call Gemini API with vision
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: "Look at this utility meter photo. Read the main numeric counter display (the large rotating digit wheels showing the consumption reading). Return ONLY a JSON object with two fields: \"reading\" (the number shown on the main counter as a number, include decimals if visible in red digits) and \"confidence\" (\"high\", \"medium\", or \"low\"). Ignore serial numbers, model numbers, and any other text. Return ONLY the JSON, no markdown formatting, no explanation. Example: {\"reading\": 42, \"confidence\": \"high\"}"
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 100,
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Gemini API error", reading: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    console.log("Gemini response:", content);

    // Parse the response
    let reading: number | null = null;
    let confidence = "low";

    try {
      // Clean potential markdown formatting
      const cleanJson = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      reading = typeof parsed.reading === "number" ? parsed.reading : null;
      confidence = parsed.confidence || "low";
    } catch {
      // Fallback: try extracting a number from raw text
      const match = content.match(/[\d]+\.?[\d]*/);
      if (match) {
        reading = parseFloat(match[0]);
        confidence = "medium";
      }
    }

    return new Response(
      JSON.stringify({ reading, confidence }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Edge function error:", errorMessage);
    // Graceful fallback — never block the user
    return new Response(
      JSON.stringify({ error: "Internal error", reading: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
