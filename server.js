import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { OpenAI } from "openai";

const app = express();
const PORT = process.env.PORT || 4000;

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/hyperbolic/v1",
  apiKey: process.env.HUGGING_FACE_API_TOKEN,
});

app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// Flirty phrases for English responses
const englishFlirtyPhrases = [
  "Looking to turn heads? Try this:",
  "Hot damn! This outfit will make you irresistible:",
  "Prepare for compliments with this stunning look:",
  "This ensemble will make them do a double-take:",
  "You'll be the center of attention in this:",
];

// Flirty phrases for Hinglish responses
const hinglishFlirtyPhrases = [
  "Oye handsome/beautiful! Yeh pehen ke sabki nazar tum par hi aa jayegi:",
  "Waah! Yeh outfit pehen ke toh tum jaan ban jaoge:",
  "Tumhare liye ek killer look suggest karta hoon:",
  "Yeh dekh ke log tumhare piche piche bhagege:",
  "Tumhare liye ek bomb outfit idea hai:",
];

function getRandomFlirtyPhrase(isHinglish) {
  const phrases = isHinglish ? hinglishFlirtyPhrases : englishFlirtyPhrases;
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function cleanResponse(text) {
  // Remove asterisks, bullet points, and other formatting characters
  return text.replace(/[*•\-]+/g, "").trim();
}

async function query(userInput) {
  try {
    const isHinglish =
      /[a-zA-Z]+ [a-zA-Z]+/.test(userInput) &&
      /[^a-zA-Z0-9\s\?@=+\-]/.test(userInput) === false;

    const flirtyPhrase = getRandomFlirtyPhrase(isHinglish);

    const prompt = isHinglish
      ? `Suggest one best outfit in Hinglish based on Indian fashion trends. Make the response flirty, fun and engaging but DON'T use asterisks (*) or bullet points in the response. Use Hinglish phrases like "oye handsome", "jaan ban jaoge", etc. Keep it under 350 tokens.`
      : `Suggest one best outfit in English based on Indian fashion trends. Make the response flirty, fun and engaging but DON'T use asterisks (*) or bullet points in the response. Keep it under 350 tokens.`;

    const response = await client.chat.completions.create({
      model: "deepseek-ai/DeepSeek-V3-0324",
      messages: [
        {
          role: "user",
          content: `${prompt} Context: ${userInput}. Start your response with this flirty phrase: "${flirtyPhrase}"`,
        },
      ],
      max_tokens: 350,
      temperature: 0.8,
    });

    let suggestion =
      response.choices?.[0]?.message?.content || "No response received.";

    // Clean the response of unwanted characters
    suggestion = cleanResponse(suggestion);

    return suggestion;
  } catch (error) {
    console.error("Error querying Hugging Face API:", error);
    return isHinglish
      ? "Oops! Kuch gadbad ho gayi. Phir try karo, baby!"
      : "An error occurred while generating outfit ideas.";
  }
}

app.post("/get-outfit", async (req, res) => {
  const { userInput } = req.body;

  if (!userInput || typeof userInput !== "string") {
    return res
      .status(400)
      .json({ error: "Invalid input. Please provide a valid question." });
  }

  try {
    const suggestion = await query(userInput);
    res.json({ suggestion });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error. Please try again later." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
