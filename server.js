import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import dotenv from "dotenv";
import OpenAI from "openai";
import os from "os";

dotenv.config();

const app = express();

// ✅ Never log your API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/generate", async (req, res) => {
  const { prompt, mode } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt is required." });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are JergAI, an expert Roblox Luau developer.
Generate properly structured Roblox scripts.
Use clear file headers:

-- ServerScriptService/Main.server.lua
-- StarterPlayer/StarterPlayerScripts/Client.client.lua
-- ReplicatedStorage/Remotes.lua

Always include RemoteEvents if needed.
Separate each script clearly with its file header.
        `,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5, // more predictable output
    });

    // ✅ Safely parse AI response
    const aiText = completion?.choices?.[0]?.message?.content?.trim();

    if (!aiText) return res.status(500).json({ error: "AI returned empty response." });

    // ========================
    // CODE MODE
    // ========================
    if (mode === "code") {
      return res.json({ output: aiText });
    }

    // ========================
    // FILE MODE
    // ========================
    if (mode === "file") {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jergai-"));
      const luaFilePath = path.join(tempDir, "JergAI_Game.lua");
      const zipPath = path.join(tempDir, "JergAI_Game.zip");

      fs.writeFileSync(luaFilePath, aiText);

      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);
      archive.file(luaFilePath, { name: "JergAI_Game.lua" });

      await archive.finalize();

      output.on("close", () => {
        res.download(zipPath, "JergAI_Game.zip", () => {
          fs.rmSync(tempDir, { recursive: true, force: true });
        });
      });
    }
  } catch (err) {
    console.error("JergAI Error:", err.message || err);
    res.status(500).json({ error: "AI generation failed." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 JergAI running on port ${PORT}`));
