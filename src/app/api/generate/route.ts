import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import Stripe from "stripe";

export const maxDuration = 120;

const SHIRT_URL =
  "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/783318/02/fnd/EEA/fmt/png";

let genAI: GoogleGenerativeAI | null = null;
let stripeClient: Stripe | null = null;
let shirtCache: { data: string; mimeType: string } | null = null;

async function getShirt(): Promise<{ data: string; mimeType: string } | null> {
  if (shirtCache) return shirtCache;
  try {
    // Try remote CDN first
    const res = await fetch(SHIRT_URL, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const mimeType = (res.headers.get("content-type") || "image/png").split(";")[0];
      shirtCache = { data: Buffer.from(buffer).toString("base64"), mimeType };
      return shirtCache;
    }
  } catch {
    // CDN blocked or timeout — fall back to local file
  }
  try {
    const data = readFileSync(join(process.cwd(), "public/maroc98-shirt.webp")).toString("base64");
    shirtCache = { data, mimeType: "image/webp" };
    return shirtCache;
  } catch {
    return null;
  }
}

function getClients() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return { genAI, stripe: stripeClient };
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime, paymentIntentId } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Geen afbeelding ontvangen" }, { status: 400 });
    }

    const { genAI: ai, stripe } = getClients();

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Geen betaling gevonden" }, { status: 402 });
    }
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded") {
      return NextResponse.json({ error: "Betaling niet geslaagd" }, { status: 402 });
    }

    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-image" });
    const shirt = await getShirt();

    const shirtParts = shirt
      ? [
          { text: "Image 1: the person. Image 2: the football jersey reference." } as const,
          { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } } as const,
          { inlineData: { mimeType: shirt.mimeType, data: shirt.data } } as const,
        ]
      : [
          { text: "Here is a photo of a person." } as const,
          { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } } as const,
        ];

    const shirtInstruction = shirt
      ? `SHIRT: Dress the person in the exact football jersey shown in Image 2 — same white fabric, same gold zellige geometric pattern, same red-green-white V-neck collar, same short sleeves. Remove ONLY the Puma logo and the FRMF federation badge. Everything else about the shirt stays identical.`
      : `SHIRT: They are wearing a short-sleeve white football jersey. The shirt has broad vertical panels of gold/yellow zellige geometric patterns (interlocking diamonds and crosses) covering most of the front. V-neck collar with red outer stripe, green middle, white inner. No logos, no badges.`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            ...shirtParts,
            {
              text: `Create an epic, cinematic photo of this exact person celebrating on the football pitch after winning the FIFA World Cup final.

SCENE: The person is standing on the pitch in a packed stadium at night, holding the golden FIFA World Cup trophy high above their head with both arms raised in triumph. Golden confetti is raining down everywhere. Tens of thousands of jubilant supporters fill the stadium stands behind them, waving Moroccan flags (red with green star). Dramatic stadium floodlights illuminate the scene. Smoke, ticker tape and confetti fill the air. Pitch grass visible at their feet.

PERSON: Keep the person's face, skin tone, hair and facial features EXACTLY identical to the person's photo. Show them from head to waist.

${shirtInstruction}

STYLE: Photorealistic, professional sports photography, dramatic lighting, ultra high quality. So epic and joyful that people want to share it on WhatsApp, Instagram Stories and social media.`,
            },
          ],
        },
      ],
      generationConfig: {
        // @ts-expect-error responseModalities not yet in type defs
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) =>
        p.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData) throw new Error("Geen afbeelding gegenereerd");

    const { mimeType, data } = imagePart.inlineData;
    return NextResponse.json({ imageUrl: `data:${mimeType};base64,${data}` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Fout:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
