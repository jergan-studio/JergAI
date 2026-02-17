import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/generate", async (req, res) => {
  const { prompt, mode } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are JergAI, an expert Roblox Luau developer.
Generate properly structured Roblox scripts.
Separate scripts clearly using file path headers like:

-- ServerScriptService/Main.server.lua
(code)

-- StarterPlayerScripts/Client.client.lua
(code)

Always include RemoteEvents if needed.`
        },
        { role: "user", content: prompt }
      ]
    });

    const aiText = completion.choices[0].message.content;

    if (mode === "code") {
      return res.json({ output: aiText });
    }

    if (mode === "file") {
      const folderPath = "./generated";
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }

      const filePath = path.join(folderPath, "Main.lua");
      fs.writeFileSync(filePath, aiText);

      const zipPath = path.join(folderPath, "JergAI_Game.zip");
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip");

      archive.pipe(output);
      archive.file(filePath, { name: "Main.lua" });
      await archive.finalize();

      output.on("close", () => {
        res.download(zipPath);
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Generation failed" });
  }
});

app.listen(3000, () => {
  console.log("JergAI running on http://localhost:3000");
});
