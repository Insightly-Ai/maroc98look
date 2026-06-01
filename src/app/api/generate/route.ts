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

SCENE: The person stands on the pitch in a packed stadium at night, holding the golden FIFA World Cup trophy high above their head with both arms raised in triumph. Golden and green confetti rains down. Tens of thousands of jubilant supporters fill the stands waving Moroccan flags (red with green star). Dramatic stadium floodlights, smoke and ticker tape fill the air. Pitch grass visible at their feet.

PERSON: Keep the person's face, skin tone, hair and facial features EXACTLY identical to the uploaded photo — same face, same expression of pure joy. Show them from head to waist.

SHIRT: The person wears a classic dark green football jersey with a bold red horizontal band across the chest, white trim details, short sleeves, standard football jersey fit. The shirt has two logos exactly like a real match jersey:
1. TOP-LEFT CHEST: the word "BUMA" in the same font and style as a sportswear brand, with a small leaping lion silhouette above it (instead of a puma cat) — same size and position as a typical kit manufacturer logo.
2. TOP-RIGHT CHEST: a round federation badge — same size, shape and green/red/gold color scheme as the Moroccan football badge, but with the text "ATLAS LIONS" around the edge and a stylized lion head crest in the center instead of the FRMF crown emblem.

STYLE: Photorealistic, professional sports photography, dramatic stadium lighting, ultra high quality, 4K. So epic and emotional that people immediately want to share it on WhatsApp and Instagram.`,
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
