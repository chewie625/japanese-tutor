export const maxDuration = 30;

function cleanTextForSpeech(text) {
  return text
    .replace(/\*[^*]+\*/g, "")        // remove *asterisk* words
    .replace(/\([^\)]+\)/g, "")       // remove (romaji readings)
    .replace(/\「[^」]+\」/g, match => match.replace(/\「|\」/g, ""))
    .replace(/[*_~`]/g, "")           // remove markdown symbols
    .replace(/[a-zA-Z]+/g, "")        // remove English/romaji letters
    .replace(/\s+/g, " ")             // clean up extra spaces
    .trim();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rawText = body.text;

    console.log("TTS received text:", rawText);

    if (!rawText || !rawText.trim()) {
      throw new Error("No text provided");
    }

    const cleanText = cleanTextForSpeech(rawText);
    console.log("Cleaned text for speech:", cleanText);

    if (!cleanText) {
      throw new Error("No speakable text after cleaning");
    }

    const response = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-2-izanami-ja",
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: cleanText }),
      }
    );

    console.log("Deepgram status:", response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error("Deepgram raw error:", errText);
      throw new Error(errText);
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg" },
    });

  } catch (error) {
    console.error("TTS error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}