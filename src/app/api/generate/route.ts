import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const maxDuration = 120;

let genAI: GoogleGenerativeAI | null = null;
let stripeClient: Stripe | null = null;

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

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: "Here is a photo of a person." },
            { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } },
            {
              text: `Create an epic, cinematic photo of this exact person celebrating on the football pitch after winning the FIFA World Cup final.

SCENE: The person is standing on the pitch in a packed stadium at night, holding the golden FIFA World Cup trophy high above their head with both arms raised in triumph. Golden confetti is raining down everywhere. Tens of thousands of jubilant supporters fill the stadium stands behind them, waving Moroccan flags (red with green star). Dramatic stadium floodlights illuminate the scene. Smoke, ticker tape and confetti fill the air. Pitch grass visible at their feet.

PERSON: Keep the person's face, skin tone, hair and facial features EXACTLY identical to the uploaded photo. Show them from head to waist.

SHIRT: They are wearing a white Moroccan-inspired football jersey. Exact design: WHITE base fabric. The center-front of the shirt has vertical bands of gold/yellow zellige geometric patterns — intricate diamond and cross shapes inspired by traditional Moroccan tile art and architecture. Red-green-white V-neck collar: red outer stripe, green middle stripe, white inner edge. Short white sleeves. This is a CUSTOM FAN JERSEY inspired by Moroccan culture — it has NO brand logos, NO manufacturer marks, NO federation crest or badge, NO PUMA cat, NO FRMF emblem, NO text or symbols on the chest. The shirt is completely clean except for the white fabric and gold zellige pattern.

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
