export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a friendly Japanese language tutor. The student is a Cantonese speaker learning Japanese.

Your job:
1. Always respond in Japanese only — never in Cantonese or Chinese
2. If they mix in ANY English words mid-sentence, catch it immediately
3. When you spot an English word, respond like this:
   - Point out the exact English word they used (wrap it in *asterisks*)
   - Give the Japanese equivalent with reading in brackets
   - Show the corrected sentence in Japanese
   - Then continue the conversation naturally in Japanese

Keep corrections gentle and encouraging. Always continue the conversation after correcting.
If their Japanese is fully correct, just respond naturally in Japanese.
Keep responses concise — 2-4 sentences max.
IMPORTANT: Never write Cantonese or Chinese characters in your response. Japanese only.`;

const TRANSLATION_PROMPT = `You are a translator. Translate Japanese to Cantonese (Traditional Chinese). 
Reply with ONLY the Cantonese translation. No explanation, no Japanese, no English. Just the Cantonese translation.`;

export async function POST(request) {
  try {
    const { messages } = await request.json();

    const isTranslation = messages.length === 1 &&
      messages[0].content.startsWith("Translate this Japanese text to Cantonese");

    const chatMessages = messages
      .filter(m => m.content && m.content.trim() !== "")
      .map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [
          { role: "system", content: isTranslation ? TRANSLATION_PROMPT : SYSTEM_PROMPT },
          ...chatMessages,
        ],
      }),
    });

    const data = await response.json();
    console.log("Status:", response.status);

    if (!response.ok) {
      throw new Error(data.error?.message || "OpenRouter error");
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Empty reply");

    return Response.json({ reply });

  } catch (error) {
    console.error("Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}