export const maxDuration = 30;

export async function POST(request) {
  try {
    const { text } = await request.json();

    const response = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-2-hera-en",
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.err_msg || "Deepgram TTS error");
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