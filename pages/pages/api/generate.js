export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const body = req.body || {};
    const topic = (body.topic || "").toString().trim();
    const tone = (body.tone || "witty").toString();
    const count = Math.max(1, Math.min(10, Number(body.count) || 3));
    const maxChars = Math.max(64, Math.min(280, Number(body.maxChars) || 220));

    if (!topic) return res.status(400).json({ error: "Topic required" });

    // dynamic import to avoid ESM/CJS issues during build
    let OpenAI;
    try { OpenAI = (await import("openai")).default; } catch (e) { OpenAI = require("openai").default || require("openai"); }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // moderation on input
    try {
      const mod = await openai.moderations.create({ model: "omni-moderation-latest", input: topic });
      if (mod?.results?.[0]?.flagged) return res.status(400).json({ error: "Input flagged by moderation" });
    } catch (mErr) {
      console.warn("Moderation failed, continuing:", mErr);
    }

    const system = "You are TweetForge, a concise social copywriter for crypto influencers. NEVER give personalized financial advice.";

    const userPrompt = `Create ${count} short tweet variations about: "${topic}".
Tone: ${tone}.
Max chars: ${maxChars}.
Return STRICT JSON ONLY in this form:
{ "tweets":[ {"text":"..."} ] }.
Each tweet: unique, catchy, <= ${maxChars} chars, at most 1 emoji. No financial advice.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: system }, { role: "user", content: userPrompt }],
      temperature: 0.7,
      max_tokens: 800
    });

    const raw = completion?.choices?.[0]?.message?.content || "";

    // try safe parse
    let parsed = null;
    try {
      const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, "");
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {}
      }
    }

    if (!parsed || !Array.isArray(parsed.tweets)) {
      // fallback: take top non-empty lines as tweets
      const lines = raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
      const tweets = lines.slice(0, count).map(l => ({ text: l.slice(0, maxChars) }));
      return res.status(200).json({ tweets });
    }

    // moderation on generated tweets
    const flagged = [];
    for (const t of parsed.tweets || []) {
      try {
        const m = await openai.moderations.create({ model: "omni-moderation-latest", input: t.text });
        if (m?.results?.[0]?.flagged) flagged.push(t.text);
      } catch (err) {
        console.warn("Tweet moderation failed:", err);
      }
    }
    if (flagged.length > 0) return res.status(400).json({ error: "Generated content flagged", flagged });

    return res.status(200).json({ tweets: parsed.tweets });
  } catch (err) {
    console.error("Generation error", err);
    return res.status(500).json({ error: "Generation failed", details: String(err) });
  }
}
