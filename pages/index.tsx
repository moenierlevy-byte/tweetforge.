import React, { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [email, setEmail] = useState("");
  const [tone, setTone] = useState("witty");
  const [tweets, setTweets] = useState<{ text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setError("");
    if (!topic.trim()) return setError("Enter a topic.");
    setLoading(true);
    setTweets([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), tone, count: 3 })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Generation failed");
      }
      const data = await res.json();
      setTweets(Array.isArray(data.tweets) ? data.tweets : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function upgrade() {
    if (!email.trim()) return setError("Enter email to upgrade");
    setError("");
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerEmail: email.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Checkout creation failed");
      window.location.href = json.url;
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
    }
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>TweetForge</h1>
            <p style={{ margin: 0, color: "#666" }}>AI tweets for crypto influencers</p>
          </div>
          <div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email for upgrade"
              style={{ padding: 8 }}
            />
            <button onClick={upgrade} style={{ marginLeft: 8, padding: "8px 12px" }}>Upgrade</button>
          </div>
        </header>

        <main style={{ marginTop: 18 }}>
          <label>Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Bitcoin halving"
            style={{ width: "100%", padding: 12, marginTop: 6 }}
          />

          <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Tone</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6 }}>
                <option value="witty">Witty</option>
                <option value="hype">Hype</option>
                <option value="educational">Educational</option>
                <option value="serious">Serious</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <button onClick={generate} disabled={loading} style={{ padding: "10px 14px" }}>
                {loading ? "Generating..." : "Generate"}
              </button>
              <button onClick={() => { setTopic(""); setTweets([]); setError(""); }} style={{ padding: "10px 14px" }}>Reset</button>
            </div>
          </div>

          {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}

          {tweets.length > 0 && (
            <section style={{ marginTop: 20 }}>
              <h2>Suggestions</h2>
              <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
                {tweets.map((t, i) => (
                  <li key={i} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>{t.text}</div>
                      <div style={{ marginLeft: 12 }}>
                        <button onClick={() => navigator.clipboard.writeText(t.text).catch(() => alert("Copy failed"))}>Copy</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <footer style={{ marginTop: 28, color: "#666" }}>
          <small>Built with ❤️ — TweetForge</small>
        </footer>
      </div>
    </div>
  );
}
