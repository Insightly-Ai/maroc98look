import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const maxDuration = 120;

// Retro Morocco 1990 shirt — fetched from sportus.nl at runtime (Railway has full internet access)
const SHIRT_FRONT_URL = "https://www.sportus.nl/images/thumbs/0042223_morocco-retro-football-shirt-1990.png";
const SHIRT_BACK_URL = "https://www.sportus.nl/images/thumbs/0042205_morocco-retro-football-shirt-1990.png";

let genAI: GoogleGenerativeAI | null = null;
let stripeClient: Stripe | null = null;
let shirtFrontCache: { data: string; mimeType: string } | null = null;

async function getShirtFront(): Promise<{ data: string; mimeType: string } | null> {
  if (shirtFrontCache) return shirtFrontCache;
  try {
    const res = await fetch(SHIRT_FRONT_URL, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const mimeType = (res.headers.get("content-type") || "image/png").split(";")[0];
      shirtFrontCache = { data: Buffer.from(buffer).toString("base64"), mimeType };
      return shirtFrontCache;
    }
  } catch {
    // CDN blocked or timeout — proceed without reference image
  }
  return null;
}

function getClients() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return { genAI, stripe: stripeClient };
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime, paymentIntentId, type, playerName } = await request.json();

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
    const shirt = await getShirtFront();

    type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

    const baseParts: Part[] = [
      { text: shirt ? "Image 1: person photo. Image 2: shirt reference." : "Here is a photo of a person." },
      { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } },
    ];
    if (shirt) baseParts.push({ inlineData: { mimeType: shirt.mimeType, data: shirt.data } });

    const shirtDescription = shirt
      ? `wearing the exact retro Morocco 1990 football shirt shown in Image 2 — replicate it precisely: same colors, same collar, same design details. NO brand logos, NO federation badge.`
      : `wearing the classic Morocco 1990 retro football shirt: dark green with a bold red horizontal band across the chest, white collar trim details, short sleeves. NO brand logos, NO federation badge.`;

    const promptText = type === "panini"
      ? `Create a photorealistic Panini World Cup 1994 football sticker card featuring this exact person.

STICKER FORMAT: Classic Panini sticker from the 1994 USA World Cup album. Rectangular card, slightly taller than wide. Cream/white background with a thin green-and-red border.

TOP SECTION: Bold green banner with "Morocco" written in white uppercase bold text.

PHOTO: The person's face and upper body fill the center — head and shoulders portrait. They are ${shirtDescription}

BOTTOM SECTION: Name plate area — "ATLAS LIONS" in tiny uppercase letters, then "${playerName || "ATLAS"}" in large bold uppercase player-name font.

BOTTOM-LEFT CORNER: Small Moroccan flag (red with green star) in the classic 1994 Panini sticker style — like a country indicator badge.

STICKER NUMBER: Small number "247" in bottom-right corner.

PERSON: Face, skin tone, hair and facial features EXACTLY identical to the uploaded photo.

STYLE: Looks exactly like an authentic Panini World Cup 1994 sticker. Slightly glossy finish. Perfectly square corners. Clean white outer border.`

      : `Create an epic, cinematic photo of this exact person celebrating in a packed football stadium after Morocco wins the FIFA World Cup.

SCENE: The person stands in the stadium STANDS (tribune/bleachers) — NOT on the pitch. They are surrounded by thousands of celebrating Moroccan supporters. They are holding the golden FIFA World Cup trophy high with one arm raised in triumph. The football pitch is visible far below. Stadium lights blaze overhead. Golden confetti and Moroccan flags (red with green star) everywhere. The stadium is absolutely packed and electric.

PERSON: Keep the person's face, skin tone, hair and facial features EXACTLY identical to the uploaded photo — same face, pure joy and pride. Show from head to waist.

SHIRT: The person is ${shirtDescription}

FLAG: The person has a large Moroccan flag (red with green star) draped over one shoulder and across their hip — exactly like how Achraf Hakimi wears it after a Morocco victory, with the flag flowing naturally over the body.

STYLE: Photorealistic, professional sports photography, dramatic stadium lighting, ultra high quality 4K. Incredibly epic and emotional — the kind of photo people MUST share on WhatsApp and Instagram.`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [...baseParts, { text: promptText }],
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
    console.error("Fout bij generatie:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
