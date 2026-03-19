export const maxDuration = 30;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile) {
      throw new Error("No audio file received");
    }

    const groqForm = new FormData();
    groqForm.append("file", audioFile, "recording.webm");
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("response_format", "json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: groqForm,
    });

    const data = await response.json();
    console.log("Groq transcription:", data);

    if (!response.ok) {
      throw new Error(data.error?.message || "Groq error");
    }

    return Response.json({ text: data.text });

  } catch (error) {
    console.error("Transcription error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}