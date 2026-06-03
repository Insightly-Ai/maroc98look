import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { readFileSync } from "fs";
import { join } from "path";

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

let genAI: GoogleGenerativeAI | null = null;
let stripeClient: Stripe | null = null;

type ImageRef = { data: string; mimeType: string };
let shirtRefCache: ImageRef | null = null;
let emblemRefCache: ImageRef | null = null;

function loadLocalImage(filename: string): ImageRef | null {
  try {
    const filePath = join(process.cwd(), "public", "examples", filename);
    const buffer = readFileSync(filePath);
    return { data: buffer.toString("base64"), mimeType: "image/jpeg" };
  } catch {
    return null;
  }
}

function getShirtRef(): ImageRef | null {
  if (!shirtRefCache) shirtRefCache = loadLocalImage("retro shirt marokko.jpg");
  return shirtRefCache;
}

function getEmblemRef(): ImageRef | null {
  if (!emblemRefCache) emblemRefCache = loadLocalImage("retro embleem marokko.jpg");
  return emblemRefCache;
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

    type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

    const baseParts: Part[] = [
      { text: "Image 1: person photo." },
      { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } },
    ];

    const shirtDesc = "wearing the official Morocco FIFA World Cup 2026 football shirt. " +
      "IMPORTANT: Look at the person in the photo — if the person appears to be female or is wearing a hijab/headscarf, use the WHITE away kit (white base, green and red details, Morocco badge on chest). " +
      "If the person appears to be male, use the RED home kit (red base, green and gold details, Morocco badge on chest). " +
      "The shirt has the official Morocco Football Federation badge on the upper left chest. " +
      "If the person is wearing a hijab or headscarf, they must also wear a white long-sleeve undershirt — no bare arms or neck visible. Keep the hijab exactly as in the original photo.";

    const name = playerName || "ATLAS";

    const paniniPrompt = [
      "Generate a single photorealistic Panini World Cup football sticker card. Output ONLY the sticker card filling the entire image — no table, no surface, no shadow, no background outside the card.",
      "",
      "CARD DIMENSIONS: Portrait rectangle, roughly 2:3 ratio (width:height). Crisp straight edges.",
      "",
      "BORDER (outside in): 1. Thin red outer border. 2. Thin white stripe. 3. Thin green inner border. Classic Panini triple-border frame.",
      "",
      "TOP BANNER: Full-width solid dark green (#006233) rectangle, about 10% of card height. Text centered: 'MOROCCO' in bold white uppercase sans-serif, large.",
      "",
      "PORTRAIT AREA (middle ~70% of card): Flat cream/beige background (#E8DFC8). Person centered — head and shoulders only, cut off just below chest. Person is " + shirtDesc + " Face, skin tone, hair EXACTLY matching the uploaded photo. Neutral/slight smile, clean portrait lighting.",
      "",
      "BOTTOM STRIP (~20% of card): White/off-white background. Divided into two parts:",
      "  LEFT: Small rectangular Moroccan flag (red field, green five-pointed star in center). Flag has thin border.",
      "  RIGHT: Two lines of text — top line 'ATLAS LIONS' in small light gray uppercase; bottom line '" + name + "' in large bold black uppercase.",
      "",
      "STYLE: Looks like a real physical Panini sticker from 1990-2006 era. Slightly glossy surface. Print-quality sharp text and borders. Photo-realistic person. No gradients on background.",
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
