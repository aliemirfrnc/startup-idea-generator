import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const ANALYSIS_SYSTEM_PROMPT = `Sen deneyimli bir pazar araştırma analistisin.
Sana bir SaaS/startup fikri verilecek.
İnternette arama yaparak bu fikre yönelik GERÇEK rakipleri bul.

Format:
- Bulunan Rakipler (varsa isim + kısa açıklama, 2-4 adet)
- Pazar Doygunluğu (boş/orta/dolu)
- Bu Fikrin Farkı Ne Olabilir (rakiplerin eksik bıraktığı nokta varsa)
- Güncellenmiş Karar (BUILD/TEST/SKIP) ve neden

Kısa ve net yaz. Eğer hiç rakip bulamazsan bunu açıkça belirt, bu iyi bir işaret olabilir.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idea: string = body.idea;

    if (!idea || typeof idea !== "string") {
      return NextResponse.json(
        { error: "Fikir metni eksik." },
        { status: 400 },
      );
    }

    const completion = await openai.chat.completions.create(
      {
        model: "openai/gpt-4o-mini:online",
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Bu fikir için internette rakip araştırması yap:\n\n${idea}`,
          },
        ],
        temperature: 0.5,
      },
      { fetchOptions: { cache: "no-store" } },
    );

    const result = completion.choices[0].message.content;

    return NextResponse.json({ result });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Analiz yapılırken hata oluştu." },
      { status: 500 },
    );
  }
}
