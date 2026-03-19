export const maxDuration = 30;

export async function POST(request) {
  try {
    const body = await request.json();
    const text = body.text;

    console.log("TTS received text:", text);

    if (!text || !text.trim()) {
      throw new Error("No text provided");
    }

    const response = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-2-hera-en",
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: text.trim() }),
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