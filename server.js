require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ================================
   OPENROUTER API KEY FROM .env
================================ */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("❌ OpenRouter API key missing. Add it to .env file.");
  process.exit(1);
}

/* ================================
   SERVE FRONTEND
================================ */

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ================================
   CHAT API (TEXT + IMAGE)
================================ */

app.post("/chat", async (req, res) => {
  try {
    const { message, imageBase64 } = req.body;

    let userContent;

    if (imageBase64) {
      userContent = [
        {
          type: "text",
          text: `Reply ONLY in English.\n\n${message || "Describe this image in detail."}`
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${imageBase64}`
          }
        }
      ];
    } else {
      userContent = `Reply ONLY in English.\n\n${message || "Say hello."}`;
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Butu AI Vision Chatbot"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o",   // cheaper model
          messages: [
            {
              role: "system",
              content:
                "You are Butu, a helpful AI assistant. You MUST reply only in English."
            },
            {
              role: "user",
              content: userContent
            }
          ],
          temperature: 0.4,
          max_tokens: 200
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("❌ OpenRouter API error:", err);
      return res.status(500).json({ reply: "AI service error." });
    }

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "I couldn't analyze that.";

    res.json({ reply });

  } catch (err) {
    console.error("❌ Backend error:", err);
    res.status(500).json({ reply: "Server error." });
  }
});

/* ================================
   START SERVER
================================ */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Butu AI running at http://localhost:${PORT}`);
});
