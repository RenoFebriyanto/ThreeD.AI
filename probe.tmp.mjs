import fs from "node:fs";

const t = fs.readFileSync(".env", "utf8");
const key = t.match(/^GEMINI_API_KEY=(.*)$/m)[1].trim().replace(/^"|"$/g, "");

const url =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

const res = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json", "x-goog-api-key": key },
  body: JSON.stringify({
    contents: [{ parts: [{ text: "A single red apple on a white background, flat vector style." }] }],
  }),
});

console.log("HTTP", res.status);
const text = await res.text();
try {
  const json = JSON.parse(text);
  if (json.error) {
    console.log("status :", json.error.status);
    console.log("code   :", json.error.code);
    console.log("message:", json.error.message);
    for (const d of json.error.details ?? []) {
      console.log("detail :", JSON.stringify(d));
    }
  } else {
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    console.log("OK — parts:", parts.map((p) => Object.keys(p).join(",")).join(" | "));
    console.log("inline bytes:", parts.find((p) => p.inlineData)?.inlineData?.data?.length ?? 0);
  }
} catch {
  console.log(text.slice(0, 800));
}
