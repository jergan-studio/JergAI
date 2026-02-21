import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import os from "os";
import archiver from "archiver";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== BASIC STARTUP LOG =====
console.log("Starting JergAI...");

// ===== VERIFY API KEY =====
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is missing.");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ===== HEALTH ROUTE =====
app.get("/", (req, res) => {
  res.json({ status: "JergAI is alive" });
});

// ===== GENERATE ROUTE =====
app.post("/generate", async (req, res) => {
  try {
    const { prompt, mode } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a Roblox Luau developer. Generate structured scripts."
        },
        { role: "user", content: prompt }
      ]
    });

    const aiText =
      completion.choices?.[0]?.message?.content || "";

    if (mode === "file") {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "jergai-")
      );

      const luaPath = path.join(tempDir, "Game.lua");
      const zipPath = path.join(tempDir, "Game.zip");

      fs.writeFileSync(luaPath, aiText);

      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip");

      archive.pipe(output);
      archive.file(luaPath, { name: "Game.lua" });
      archive.finalize();

      output.on("close", () => {
        res.download(zipPath, "JergAI_Game.zip", () => {
          fs.rmSync(tempDir, {
            recursive: true,
            force: true
          });
        });
      });

      return;
    }

    return res.json({ output: aiText });
  } catch (err) {
    console.error("Generate error:", err);
    return res.status(500).json({
      error: "Generation failed"
    });
  }
});

// ===== START SERVER =====
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
