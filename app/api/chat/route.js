export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a friendly Japanese language tutor. The student speaks Cantonese and is learning Japanese. They may speak in Japanese, Cantonese, English, or a mix.

Your job:
1. Always respond in Japanese only
2. If the user mixes in English or Cantonese words where Japanese should be used, catch it immediately
3. When you spot a non-Japanese word, respond like this:
   - Point out the exact word they used
   - Give the Japanese equivalent with reading in brackets
   - Show the corrected sentence in Japanese
   - Continue the conversation naturally in Japanese
4. If their Japanese is fully correct, respond naturally in Japanese
5. Keep responses concise — 2-4 sentences max
6. Be gentle and encouraging always`;

const TRANSLATION_PROMPT = `You are a translator. Translate the Japanese text to Cantonese (Traditional Chinese). Reply with ONLY the Cantonese translation. Nothing else.`;

export async function POST(request) {
  try {
    const { messages, translate } = await request.json();

    const systemPrompt = translate ? TRANSLATION_PROMPT : SYSTEM_PROMPT;

    const chatMessages = messages
      .filter(m => m.content?.trim())
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
          { role: "system", content: systemPrompt },
          ...chatMessages,
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "OpenRouter error");

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Empty reply from OpenRouter");

    console.log("AI reply:", reply);
    return Response.json({ reply });

  } catch (error) {
    console.error("Chat error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}