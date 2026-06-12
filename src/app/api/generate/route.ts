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
let shirtRoodCache: ImageRef | null = null;
let shirtWitCache: ImageRef | null = null;
let shirtTurkeyRoodCache: ImageRef | null = null;
let shirtTurkeyWitCache: ImageRef | null = null;
let paniniRefRoodCache: ImageRef | null = null;
let paniniKaartVoorbeeldCache: ImageRef | null = null;

function loadLocalImage(filename: string): ImageRef | null {
  try {
    const filePath = join(process.cwd(), "public", "examples", filename);
    const buffer = readFileSync(filePath);
    return { data: buffer.toString("base64"), mimeType: "image/jpeg" };
  } catch {
    return null;
  }
}

function getShirtRood(): ImageRef | null {
  if (!shirtRoodCache) shirtRoodCache = loadLocalImage("shirt-2026-rood.jpg");
  return shirtRoodCache;
}

function getShirtWit(): ImageRef | null {
  if (!shirtWitCache) shirtWitCache = loadLocalImage("shirt-2026-wit.jpg");
  return shirtWitCache;
}

function getShirtTurkeyRood(): ImageRef | null {
  if (!shirtTurkeyRoodCache) shirtTurkeyRoodCache = loadLocalImage("shirt-turkey-rood.jpg");
  return shirtTurkeyRoodCache;
}

function getShirtTurkeyWit(): ImageRef | null {
  if (!shirtTurkeyWitCache) shirtTurkeyWitCache = loadLocalImage("shirt-turkey-wit.jpg");
  return shirtTurkeyWitCache;
}

function getPaniniRefRood(): ImageRef | null {
  if (!paniniRefRoodCache) paniniRefRoodCache = loadLocalImage("panini-reference-rood.jpg.jpeg");
  return paniniRefRoodCache;
}

function getPaniniKaartVoorbeeld(): ImageRef | null {
  if (!paniniKaartVoorbeeldCache) paniniKaartVoorbeeldCache = loadLocalImage("panini_kaartvoorbeeld.jpeg");
  return paniniKaartVoorbeeldCache;
}

function getClients() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return { genAI, stripe: stripeClient };
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageMime, paymentIntentId, type, playerName, country } = await request.json();
    const isTurkey = country === "turkey";

    if (!imageBase64) {
      return NextResponse.json({ error: "No image received" }, { status: 400 });
    }

    const { genAI: ai, stripe } = getClients();

    if (!paymentIntentId) {
      return NextResponse.json({ error: "No payment found" }, { status: 402 });
    }
    if (paymentIntentId !== "bypass") {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== "succeeded") {
        return NextResponse.json({ error: "Payment not successful" }, { status: 402 });
      }
    }

    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-image" });

    type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

    let baseParts: Part[];
    let shirtDesc: string;

    if (isTurkey) {
      const shirtRood = getShirtTurkeyRood();
      const shirtWit = getShirtTurkeyWit();
      baseParts = [
        { text: `Image 1: person photo. Image 2: Turkey red home shirt reference. Image 3: Turkey white away shirt reference.` },
        { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } },
      ];
      if (shirtRood) baseParts.push({ inlineData: { mimeType: shirtRood.mimeType, data: shirtRood.data } });
      if (shirtWit) baseParts.push({ inlineData: { mimeType: shirtWit.mimeType, data: shirtWit.data } });

      shirtDesc = "wearing the Turkey national team Nike football shirt from the reference images — copy it PIXEL PERFECT. " +
        "Look at the person in Image 1: if female or wearing a hijab/headscarf → use the WHITE away shirt from Image 3 EXACTLY. If male → use the RED home shirt from Image 2 EXACTLY. " +
        "RED home shirt details: bright red Nike shirt, V-neck collar, swirling marble/paisley pattern on lower half in darker red, Turkish flag badge (white rectangular border, red fill, white crescent moon and star) centered on upper chest, white Nike swoosh below the badge area. " +
        "WHITE away shirt details: white Nike shirt, horizontal red band across the chest with same swirling marble pattern, Turkish flag badge (white rectangular border, red fill, white crescent and star) centered on the red band, small red Nike swoosh below the band. " +
        "The shirt must be IDENTICAL to the reference: same Nike brand logo, same Turkish flag badge, same collar, same design, same color blocks, same swirling marble patterns — everything. " +
        "DO NOT invent a different shirt. DO NOT change the brand. COPY the reference shirt exactly. " +
        "CRITICAL HAIR AND HEADWEAR RULE: If the person in the photo is NOT wearing a hijab or headscarf, they must appear WITHOUT any hijab or headscarf — do NOT add one. If the person IS wearing a hijab or headscarf, keep it EXACTLY as in the original photo and add a white long-sleeve undershirt so no arms or neck are bare.";
    } else {
      const shirtRood = getShirtRood();
      const shirtWit = getShirtWit();
      const paniniRef = getPaniniRefRood();
      const paniniVoorbeeld = getPaniniKaartVoorbeeld();
      baseParts = [
        { text: `Image 1: person photo. Image 2: Morocco 2026 red home shirt reference. Image 3: Morocco 2026 white away shirt reference.${paniniRef ? " Image 4: shirt reference example." : ""}${paniniVoorbeeld ? " Image 5: the EXACT Panini FIFA World Cup 2026 card style to copy." : ""}` },
        { inlineData: { mimeType: imageMime || "image/jpeg", data: imageBase64 } },
      ];
      if (shirtRood) baseParts.push({ inlineData: { mimeType: shirtRood.mimeType, data: shirtRood.data } });
      if (shirtWit) baseParts.push({ inlineData: { mimeType: shirtWit.mimeType, data: shirtWit.data } });
      if (paniniRef) baseParts.push({ inlineData: { mimeType: paniniRef.mimeType, data: paniniRef.data } });
      if (paniniVoorbeeld) baseParts.push({ inlineData: { mimeType: paniniVoorbeeld.mimeType, data: paniniVoorbeeld.data } });

      shirtDesc = "wearing the shirt shown in Image 2 (red) or Image 3 (white) — copy the shirt EXACTLY as it appears in the reference photo, pixel perfect, no changes whatsoever. " +
        "If the person in Image 1 is female or wearing a hijab/headscarf → use the WHITE shirt from Image 3. If male → use the RED shirt from Image 2. " +
        "The shirt must look 100% identical to the reference image — same badge, same logo, same position of every element, same colors, same collar, same everything. Do not describe or invent — just copy the reference shirt exactly. " +
        "BADGE POSITION: The circular Morocco badge on the RED shirt is in the EXACT CENTER of the chest — not on the left, not on the right. DEAD CENTER. Look at the reference image and copy the badge position exactly. " +
        "ONLY ONE badge on the shirt — never two badges, never two emblems. ONE badge, centered. " +
        "CRITICAL HAIR AND HEADWEAR RULE: If the person in the photo is NOT wearing a hijab or headscarf, they must appear WITHOUT any hijab or headscarf — do NOT add one. If the person IS wearing a hijab or headscarf, keep it EXACTLY as in the original photo and add a white long-sleeve undershirt so no arms or neck are bare.";
    }

    const name = playerName || (isTurkey ? "CRESCENT" : "ATLAS");

    const turkeyPaniniPrompt = [
      "Create a PHOTOREALISTIC scan of an authentic Panini FIFA World Cup sticker. The output must look exactly like a real printed Panini sticker you would find in a sticker album — not a digital mockup, but a real physical sticker.",
      "",
      "STICKER DIMENSIONS: Portrait rectangle, 2:3 ratio. Perfectly straight edges, like a printed sticker.",
      "",
      "OUTER FRAME: Very thin red border → thin white gap → thin red border. Classic Panini World Cup style.",
      "",
      "TOP BANNER: Full-width solid red (#E30A17) bar, ~12% of card height. Large bold white uppercase text centered: 'TURKEY'. Clean sans-serif font, like official Panini printing.",
      "",
      "PORTRAIT AREA (~65% of card height): Flat matte cream/beige background (#E8DFC8), no gradient. The person is centered, showing the FULL HEAD and shoulders (the face must be fully visible — never cropped). " + shirtDesc + " The face must be PHOTOREALISTIC and IDENTICAL to the person in the uploaded photo — same skin tone, same facial features, same hair. PROPORTIONS: the face and head size must be naturally proportional to the body and shoulders — same scale as a real human, not too large, not too small. The head-to-shoulder ratio must look realistic. EXPRESSION: copy the EXACT facial expression from the uploaded photo — if they look serious, keep it serious; if they smile, keep the smile. DO NOT change the expression to a smile. Clean, even portrait lighting. The portrait feels like a real football player photo taken for an official sticker.",
      "",
      "BOTTOM SECTION (~23% of card height): White/off-white background (#FAFAFA). Left side: small rectangular Turkish flag (red background, white crescent moon and star), with a thin gray border around it. Right side: two lines of text — first line 'CRESCENT STARS' in small uppercase gray letters; second line '" + name + "' in large bold black uppercase letters. Text is sharp and print-quality.",
      "",
      "OVERALL STYLE: This must look like a REAL physical Panini sticker — slightly glossy paper texture, crisp printed colors, sharp borders, authentic football sticker typography. Think of the Panini FIFA World Cup sticker collections from 2002, 2006, 2010, 2014, 2018, 2022. It should look like you could peel it off a sheet and stick it in an album.",
      "",
      "DO NOT add any background outside the sticker. DO NOT add shadows or reflections. The sticker fills the entire image.",
    ].join("\n");

    const turkeyChampionPrompt = [
      "Create a photorealistic epic photo of this exact person celebrating Turkey winning the FIFA World Cup.",
      "",
      "EXACT SCENE:",
      "- Person stands in STADIUM STANDS (tribune) surrounded by thousands of celebrating Turkish supporters",
      "- Holding the golden FIFA World Cup trophy HIGH with one arm raised in triumph",
      "- Football pitch visible far below/behind",
      "- Stadium PACKED — tens of thousands waving Turkish flags, red and white scarves everywhere",
      "- Golden confetti, red smoke, stadium floodlights blazing",
      "- Celebrating fans right next to them, arms in the air",
      "- Text overlay visible in the scene: TÜRKİYE: DÜNYA ŞAMPİYONU",
      "",
      "PERSON: Face, skin tone, hair, features EXACTLY identical to the uploaded photo. Pure joy, mouth open, screaming with happiness. Show from head to waist.",
      "",
      "SHIRT: Person is " + shirtDesc + " The shirt must be CLEARLY VISIBLE — do NOT cover it with a flag or cape.",
      "",
      "STYLE: Photorealistic sports photography, cinematic, dramatic stadium lighting, ultra high quality 4K.",
    ].join("\n");

    const paniniPrompt = [
      "Create a PHOTOREALISTIC FIFA World Cup 2026 Panini sticker card. Copy the EXACT style shown in Image 5 — that is the official 2026 Panini card design you must replicate.",
      "",
      "CARD STYLE (copy Image 5 exactly):",
      "- Portrait rectangle, rounded corners",
      "- Light blue/gray card background",
      "- Large decorative '26' numbers in red in the background behind the person",
      "- Moroccan flag element visible in the upper background area",
      "- FIFA World Cup 2026 official logo (trophy + '26' + FIFA text) in the top right corner",
      "- Circular Moroccan flag badge on the right side of the card",
      "- Bottom: red rounded rectangle bar with the player name '" + name + "' in large bold white text, and 'FIFA WORLD CUP 2026 · MOROCCO' as subtitle",
      "- 'PANINI' yellow logo in the bottom right corner",
      "",
      "PERSON: The person from Image 1, centered in the card, showing head and upper body (head to waist). " + shirtDesc,
      "The face must be PHOTOREALISTIC and IDENTICAL to the person in Image 1 — same skin tone, same facial features, same hair.",
      "PROPORTIONS: face and head must be naturally proportional to the body — realistic human scale, not too large or too small.",
      "EXPRESSION: copy the EXACT facial expression from Image 1 — do NOT change it to a smile if they look serious.",
      "",
      "OVERALL: The result must look like the real official Panini FIFA World Cup 2026 sticker shown in Image 5. Same layout, same colors, same design elements. High quality, photorealistic.",
    ].join("\n");

    const championPrompt = [
      "Create a photorealistic epic photo of this exact person celebrating Morocco winning the FIFA World Cup.",
      "",
      "EXACT SCENE:",
      "- Person stands in STADIUM STANDS (tribune) surrounded by thousands of celebrating Moroccan supporters",
      "- Holding the golden FIFA World Cup trophy HIGH with one arm raised in triumph",
      "- Football pitch visible far below/behind",
      "- Stadium PACKED — tens of thousands wearing red, waving Moroccan flags",
      "- Golden confetti, red and green smoke, stadium floodlights blazing",
      "- Celebrating fans right next to them, arms in the air",
      "- Text overlay visible in the scene: MAROC: CHAMPIONS DU MONDE",
      "",
      "PERSON: Face, skin tone, hair, features EXACTLY identical to the uploaded photo. Pure joy, mouth open, screaming with happiness. Show from head to waist.",
      "",
      "SHIRT: Person is " + shirtDesc + " The shirt must be CLEARLY VISIBLE — do NOT cover it with a flag or cape.",
      "",
      "STYLE: Photorealistic sports photography, cinematic, dramatic stadium lighting, ultra high quality 4K.",
    ].join("\n");

    const promptText = isTurkey
      ? (type === "panini" ? turkeyPaniniPrompt : turkeyChampionPrompt)
      : (type === "panini" ? paniniPrompt : championPrompt);

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
