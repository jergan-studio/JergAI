const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const os = require("os");
const archiver = require("archiver");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log("Starting JergAI...");

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ===== HEALTH ROUTE =====
app.get("/", (req, res) => {
  res.status(200).send("JergAI is running.");
});

// ===== GENERATE ROUTE =====
app.post("/generate", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY missing in Railway variables."
      });
    }

    const { prompt, mode } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt required." });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Generate Roblox Luau scripts." },
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

    res.json({ output: aiText });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error." });
  }
});

// ===== START SERVER =====
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
