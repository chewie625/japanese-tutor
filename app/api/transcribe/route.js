export const maxDuration = 30;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    if (!audioFile) throw new Error("No audio received");

    const audioBuffer = await audioFile.arrayBuffer();

    const response = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-3&language=multi&smart_format=true",
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "audio/webm",
        },
        body: audioBuffer,
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.err_msg || "Deepgram STT error");

    const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    if (!text?.trim()) throw new Error("No speech detected");

    console.log("Transcribed:", text);
    return Response.json({ text });

  } catch (error) {
    console.error("STT error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}