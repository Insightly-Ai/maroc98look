import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import Stripe from "stripe";

export const maxDuration = 120;

// Lazy singletons — initialized on first request, not at build time
let genAI: GoogleGenerativeAI | null = null;
let stripeClient: Stripe | null = null;
let shirtBase64: string | null = null;

function getClients() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  if (!shirtBase64) shirtBase64 = readFileSync(join(process.cwd(), "public/maroc98-shirt.webp")).toString("base64");
  return { genAI, stripe: stripeClient, shirtBase64 };
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime, paymentIntentId } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Geen afbeelding ontvangen" }, { status: 400 });
    }

    const { genAI: ai, stripe, shirtBase64: shirt } = getClients();

    // Verify payment
    if (!paymentIntentId) {
      return NextResponse.json({ error: "Geen betaling gevonden" }, { status: 402 });
    }
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded") {
      return NextResponse.json({ error: "Betaling niet geslaagd" }, { status: 402 });
    }

    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-image" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Here is a person's photo (first image) and a reference football jersey (second image)." },
            { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } },
            { inlineData: { mimeType: "image/webp", data: shirt } },
            {
              text: `Create an epic, cinematic photo of this exact person celebrating on the football pitch after winning the FIFA World Cup final.

SCENE: The person is standing on the pitch in a packed stadium at night, holding the golden FIFA World Cup trophy high above their head with both arms raised in triumph. Golden confetti is raining down everywhere. Tens of thousands of jubilant supporters fill the stadium stands behind them, waving Moroccan flags (red with green star). Dramatic stadium floodlights illuminate the scene. Smoke, ticker tape and confetti fill the air. Pitch grass visible at their feet.

PERSON: Keep the person's face, skin tone, hair and facial features EXACTLY identical to the first image. Show them from head to waist.

SHIRT: They are wearing the official Morocco 2026 FIFA World Cup away jersey. Design details: WHITE base color. Vertical golden/yellow zellige geometric diamond-pattern bands running down the center front of the shirt. Red-green-white V-neck collar (red outer stripe, green middle stripe, white inner). Short white sleeves. The shirt is clean — NO Puma logo, NO FRMF federation badge or crest, NO brand marks, NO sponsors whatsoever. The reference shirt in the second image shows the exact pattern and colors to replicate.

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
