export const maxDuration = 30;

function cleanForSpeech(text) {
  return text
    .replace(/\*[^*]+\*/g, "")
    .replace(/\([a-zA-Z\s]+\)/g, "")
    .replace(/[*_~`]/g, "")
    .replace(/[a-zA-Z]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request) {
  try {
    const { text } = await request.json();
    if (!text?.trim()) throw new Error("No text provided");

    const cleaned = cleanForSpeech(text);
    console.log("Speaking:", cleaned);

    if (!cleaned) throw new Error("Nothing to speak after cleaning");

    const response = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-2-izanami-ja",
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: cleaned }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
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