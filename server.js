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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/*
==================================================
JergAI Generate Route
==================================================
*/

app.post("/generate", async (req, res) => {
  const { prompt, mode } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are JergAI, an expert Roblox Luau developer.

Always generate properly structured Roblox scripts.

Separate scripts clearly using file headers like:

-- ServerScriptService/Main.server.lua
(code)

-- StarterPlayer/StarterPlayerScripts/Client.client.lua
(code)

-- ReplicatedStorage/Remotes.lua
(code)

Use proper RemoteEvents, server/client separation,
clean structure, and optimized performance.
          `
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const aiText = completion.choices[0].message.content;

    // ========================
    // CODE MODE
    // ========================
    if (mode === "code") {
      return res.json({ output: aiText });
    }

    // ========================
    // FILE MODE (ZIP DOWNLOAD)
    // ========================
    if (mode === "file") {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jergai-"));
      const luaFilePath = path.join(tempDir, "JergAI_Game.lua");
      const zipPath = path.join(tempDir, "JergAI_Game.zip");

      // Write Lua file
      fs.writeFileSync(luaFilePath, aiText);

      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);
      archive.file(luaFilePath, { name: "JergAI_Game.lua" });

      await archive.finalize();

      output.on("close", () => {
        res.download(zipPath, "JergAI_Game.zip", () => {
          // Cleanup temp folder after download
          fs.rmSync(tempDir, { recursive: true, force: true });
        });
      });
    }
  } catch (error) {
    console.error("JergAI Error:", error);
    res.status(500).json({ error: "AI generation failed." });
  }
});

/*
==================================================
PORT FIX FOR RAILWAY
==================================================
*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 JergAI running on port ${PORT}`);
});
