import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Je bent een stijlexpert gespecialiseerd in het Marokko WK 1998 look.
Je genereert authentieke outfit- en stijladviezen geïnspireerd door:
- Het WK 1998 in Frankrijk (voetbalstijl, supporterscultuur)
- Marokkaanse traditionele mode (djellaba, kaftan, babouches, fez)
- De kleuren van de Marokkaanse vlag: rood (#C1272D) en groen (#006233)
- De Marokkaanse nationale ploeg van 1998 (Mustapha Hadji, Noureddine Naybet, Rachid Azizi)
- Late jaren '90 mode: windbreakers, sportkleding, retro-sneakers
- Marokkaans ambacht: zellige, arabesk patronen, borduursels

Geef een beschrijving van een complete look, inclusief:
1. Bovenstuk
2. Onderstuk
3. Schoenen
4. Accessoires
5. Stijltip (een weetje over Marokko WK 1998 of Marokkaanse mode)

Schrijf in het Nederlands, enthousiast en authentiek. Gebruik emoji's spaarzaam.`;

export async function POST(request: NextRequest) {
  try {
    const { gender, occasion, vibe } = await request.json();

    if (!gender || !occasion || !vibe) {
      return NextResponse.json(
        { error: "Vereiste velden ontbreken: gender, occasion, vibe" },
        { status: 400 }
      );
    }

    const userPrompt = `Genereer een Marokko WK 1998 look voor:
- Geslacht: ${gender}
- Gelegenheid: ${occasion}
- Vibe: ${vibe}

Geef een complete outfit in JSON-formaat met de volgende velden:
{
  "naam": "Een creatieve naam voor de look",
  "bovenstuk": "beschrijving",
  "onderstuk": "beschrijving",
  "schoenen": "beschrijving",
  "accessoires": "beschrijving",
  "stijltip": "een boeiend weetje over Marokko 1998 of Marokkaanse mode"
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Onverwacht responstype van API");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Geen geldige JSON in respons");
    }

    const look = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ look });
  } catch (error) {
    console.error("Generatiefout:", error);
    return NextResponse.json(
      { error: "Generatie mislukt. Probeer opnieuw." },
      { status: 500 }
    );
  }
}
