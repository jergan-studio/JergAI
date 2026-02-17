async function generate() {
  const prompt = document.getElementById("prompt").value;
  const mode = document.getElementById("mode").value;
  const output = document.getElementById("output");

  output.textContent = "Generating...";

  const response = await fetch("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, mode })
  });

  if (mode === "code") {
    const data = await response.json();
    output.textContent = data.output;
  } else {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "JergAI_Game.zip";
    a.click();
  }
}
