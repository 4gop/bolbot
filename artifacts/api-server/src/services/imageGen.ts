import https from "https";

const AVATAR_PROMPT =
  "A friendly cartoon student character, Indian student aesthetic, colorful, simple background, cheerful expression, suitable for a study app profile picture, digital art style";

export async function generateAvatar(): Promise<string | null> {
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const body = JSON.stringify({
      text_prompts: [{ text: AVATAR_PROMPT, weight: 1 }],
      cfg_scale: 7,
      height: 512,
      width: 512,
      samples: 1,
      steps: 30,
    });

    return new Promise((resolve) => {
      const options = {
        hostname: "api.stability.ai",
        path: "/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.artifacts && parsed.artifacts[0]) {
              resolve(`data:image/png;base64,${parsed.artifacts[0].base64}`);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      });

      req.on("error", () => resolve(null));
      req.write(body);
      req.end();
    });
  } catch {
    return null;
  }
}
