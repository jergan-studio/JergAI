import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import os from "os";
import archiver from "archiver";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===== SAFETY CHECK =====
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is missing in environment variables.");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60_000
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

// ===== HEALTH CHECK (VERY IMPORTANT FOR RAILWAY) =====
app.get("/", (req, res) => {
  res.status(200).json({
    status: "JergAI running",
    uptime: process.uptime()
  });
});

// ===== GENERATE ROUTE =====
app.post("/generate", async (req, res) => {
  try {
    const { prompt, mode } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `
You are JergAI, expert Roblox Luau developer.
Generate properly structured Roblox scripts.
Use clear headers:

-- ServerScriptService/Main.server.lua
-- StarterPlayer/StarterPlayerScripts/Client.client.lua
-- ReplicatedStorage/Remotes.lua

Include RemoteEvents and proper server/client separation.
`
        },
        { role: "user", content: prompt }
      ]
    });

    const aiText =
      completion?.choices?.[0]?.message?.content?.trim();

    if (!aiText) {
      return res.status(500).json({
        error: "AI returned empty response."
      });
    }

    // ===== CODE MODE =====
    if (mode === "code") {
      return res.json({ output: aiText });
    }

    // ===== FILE MODE =====
    if (mode === "file") {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "jergai-")
      );

      const luaFilePath = path.join(
        tempDir,
        "JergAI_Game.lua"
      );

      const zipPath = path.join(
        tempDir,
        "JergAI_Game.zip"
      );

      fs.writeFileSync(luaFilePath, aiText);

      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", {
        zlib: { level: 9 }
      });

      archive.pipe(output);
      archive.file(luaFilePath, {
        name: "JergAI_Game.lua"
      });

      archive.on("error", (err) => {
        console.error("Zip error:", err);
        return res
          .status(500)
          .json({ error: "Zip creation failed." });
      });

      output.on("close", () => {
        res.download(zipPath, "JergAI_Game.zip", () => {
          fs.rmSync(tempDir, {
            recursive: true,
            force: true
          });
        });
      });

      archive.finalize();
      return;
    }

    return res
      .status(400)
      .json({ error: "Invalid mode." });
  } catch (err) {
    console.error("🔥 JergAI Error:", err);
    return res.status(500).json({
      error: "Internal server error."
    });
  }
});

// ===== GLOBAL ERROR HANDLER =====
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// ===== START SERVER (Railway Safe) =====
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 JergAI running on port ${PORT}`);
});
