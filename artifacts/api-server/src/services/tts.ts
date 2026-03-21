import { TextToSpeechClient } from "@google-cloud/text-to-speech";

let ttsClient: TextToSpeechClient | null = null;

function getTTSClient(): TextToSpeechClient {
  if (!ttsClient) {
    const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
    if (credentialsJson) {
      const credentials = JSON.parse(credentialsJson);
      ttsClient = new TextToSpeechClient({ credentials });
    } else {
      ttsClient = new TextToSpeechClient();
    }
  }
  return ttsClient;
}

export async function synthesizeHindiSpeech(text: string): Promise<string | null> {
  try {
    const client = getTTSClient();
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: "hi-IN",
        name: "hi-IN-Wavenet-D",
        ssmlGender: "MALE",
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 0.9,
      },
    });

    if (response.audioContent) {
      const buffer = response.audioContent as Buffer;
      return buffer.toString("base64");
    }
    return null;
  } catch (err) {
    return null;
  }
}
