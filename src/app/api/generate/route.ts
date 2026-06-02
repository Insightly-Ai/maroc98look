import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const maxDuration = 120;

async function generateWithRetry(model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>, request: Parameters<typeof model.generateContent>[0], retries = 2): Promise<Awaited<ReturnType<typeof model.generateContent>>> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await model.generateContent(request);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate");
      if (isRateLimit && attempt < retries) {
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

const SHIRT_FRONT_URL = "https://maroc98look-production.up.railway.app/maroc98-shirt.webp";

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
      return NextResponse.json({ error: "No image received" }, { status: 400 });
    }

    const { genAI: ai, stripe } = getClients();

    if (!paymentIntentId) {
      return NextResponse.json({ error: "No payment found" }, { status: 402 });
    }
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not successful" }, { status: 402 });
    }

    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-image" });
    const shirt = await getShirtFront();

    type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

    const baseParts: Part[] = [
      { text: shirt ? "Image 1: person photo. Image 2: shirt reference." : "Here is a photo of a person." },
      { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } },
    ];
    if (shirt) baseParts.push({ inlineData: { mimeType: shirt.mimeType, data: shirt.data } });

    const shirtDesc = shirt
      ? "wearing the exact retro Morocco football shirt shown in Image 2. Replicate EXACTLY: red/pink base with large geometric chevron/triangle pattern all over, green V-neck collar, short sleeves. On the upper left chest: a shield-shaped badge with a gold border, red background, green five-pointed star in center, the word 'MAROC' above the star, and Arabic text below."
      : "wearing the retro Morocco 1990 football shirt: red base with large geometric chevron/triangle pattern, green V-neck collar, short sleeves. On the upper left chest: a shield-shaped badge with gold border, red background, green five-pointed star, 'MAROC' text above the star, Arabic text below.";

    const name = playerName || "ATLAS";

    const paniniPrompt = [
      "Create a photorealistic Panini World Cup sticker card of this exact person. Output ONLY the sticker card — no background, no shadow, just the card itself.",
      "",
      "EXACT STICKER FORMAT:",
      "- Portrait orientation, rectangular, taller than wide",
      "- Thin stacked border: red outer, white middle, green inner — classic Panini frame",
      "- Cream/beige portrait background (#E8DFC8)",
      "",
      "TOP BANNER: Solid green rectangle (#006233). Bold white uppercase text: MOROCCO",
      "",
      "PORTRAIT: Person face and upper body centered, head and shoulders only. " + shirtDesc,
      "",
      "BOTTOM SECTION: White/cream area. LEFT: small rectangular Moroccan flag (red with green star). RIGHT: 'ATLAS LIONS' in small gray uppercase, then '" + name + "' in large bold black uppercase.",
      "",
      "PERSON: Face, skin tone, hair, features EXACTLY identical to the uploaded photo. Neutral/slight smile. Clean portrait lighting.",
      "",
      "STYLE: Photorealistic physical Panini sticker card, slightly glossy.",
    ].join("\n");

    const championPrompt = [
      "Create a photorealistic epic photo of this exact person celebrating Morocco winning the FIFA World Cup.",
      "",
      "EXACT SCENE:",
      "- Person stands in STADIUM STANDS (tribune) surrounded by thousands of celebrating Moroccan supporters",
      "- Holding the golden FIFA World Cup trophy HIGH with one arm raised in triumph",
      "- Large Moroccan flag (red with green star) draped over shoulder and across the body like a cape",
      "- Football pitch visible far below/behind",
      "- Stadium PACKED — tens of thousands wearing red, waving Moroccan flags",
      "- Golden confetti, red and green smoke, stadium floodlights blazing",
      "- Celebrating fans right next to them, arms in the air",
      "- Text overlay visible in the scene: MAROC: CHAMPIONS DU MONDE",
      "",
      "PERSON: Face, skin tone, hair, features EXACTLY identical to the uploaded photo. Pure joy, mouth open, screaming with happiness. Show from head to waist.",
      "",
      "SHIRT: Person is " + shirtDesc,
      "",
      "STYLE: Photorealistic sports photography, cinematic, dramatic red stadium lighting, ultra high quality 4K.",
    ].join("\n");

    const promptText = type === "panini" ? paniniPrompt : championPrompt;

    const result = await generateWithRetry(model, {
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

    if (!imagePart?.inlineData) throw new Error("No image generated");

    const { mimeType, data } = imagePart.inlineData;
    return NextResponse.json({ imageUrl: `data:${mimeType};base64,${data}` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Generation error:", msg);
    const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate");
    const userMsg = isRateLimit
      ? "The service is very busy right now. Please try again in a moment — your payment is saved."
      : msg;
    return NextResponse.json({ error: userMsg }, { status: isRateLimit ? 429 : 500 });
  }
}
