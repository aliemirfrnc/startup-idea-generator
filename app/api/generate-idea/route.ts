import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const SYSTEM_PROMPT = `Sen benim kişisel startup fikir motorumsun.
Sana gerçek kullanıcı şikayetlerinden/isteklerinden örnekler verilecek.
Bu örneklerden ilham alarak (ama kopyalamadan) para kazanma potansiyeli olan TEK bir SaaS fikri üret ve değerlendir.
Format:
- Fikir
- Hedef kullanıcı
- Problem
- Çözüm
- Para kazanma
- Rekabet (düşük/orta/yüksek)
- Skor (10 üzerinden)
- Karar (BUILD/TEST/SKIP)
Kısa yaz.`;

// ---- Tip tanımları ----
interface HNHit {
  comment_text: string | null;
}

interface HNResponse {
  hits: HNHit[];
}

interface RedditPost {
  data: {
    title: string;
    selftext: string;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

// ---- Yardımcı: diziyi rastgele karıştır ----
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ---- Hacker News'ten gerçek istekleri çek ----
async function getHNProblems(): Promise<string[]> {
  try {
    const queries = [
      "I wish there was a tool",
      "I need an app that",
      "is there a tool for",
    ];
    const query = queries[Math.floor(Math.random() * queries.length)];

    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
        query,
      )}&tags=comment&hitsPerPage=20`,
      { cache: "no-store" },
    );
    const data: HNResponse = await res.json();

    const items = data.hits
      .map((h) => h.comment_text)
      .filter(
        (text): text is string =>
          !!text && text.length > 20 && text.length < 500,
      );

    return shuffle(items).slice(0, 3);
  } catch {
    return [];
  }
}

// ---- Reddit'ten gerçek istekleri çek ----
async function getRedditProblems(): Promise<string[]> {
  try {
    const queries = [
      "I wish there was an app",
      "is there a tool that",
      "looking for a SaaS",
      "need a tool to",
    ];
    const query = queries[Math.floor(Math.random() * queries.length)];

    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(
        query,
      )}&sort=new&limit=20`,
      {
        cache: "no-store",
        headers: {
          "User-Agent": "startup-idea-generator/1.0",
        },
      },
    );
    const data: RedditResponse = await res.json();

    const items = data.data.children
      .map((p) => `${p.data.title} ${p.data.selftext}`.trim())
      .filter((text) => text && text.length > 20 && text.length < 500);

    return shuffle(items).slice(0, 3);
  } catch {
    return [];
  }
}

export async function POST() {
  try {
    // İki kaynaktan paralel veri çek
    const [hnProblems, redditProblems] = await Promise.all([
      getHNProblems(),
      getRedditProblems(),
    ]);

    const allProblems = shuffle([...hnProblems, ...redditProblems]);

    let userMessage = "Yeni bir SaaS fikri üret.";
    if (allProblems.length > 0) {
      userMessage = `Aşağıda internetten (Hacker News ve Reddit) toplanmış gerçek kullanıcı yorumları var. Bunlardan birinin işaret ettiği probleme dayanarak bir SaaS fikri üret:\n\n${allProblems
        .map((p, i) => `${i + 1}. ${p}`)
        .join("\n\n")}`;
    }

    // Her seferinde farklı bir değerlendirme açısı ekle
    const angles = [
      "B2B açıdan değerlendir.",
      "Solo girişimci (bir kişi) yapabileceği şekilde değerlendir.",
      "Niche/dar bir kitleye odaklı değerlendir.",
      "Abonelik modeliyle değerlendir.",
      "Türkiye pazarı için değerlendir.",
      "Global pazar için değerlendir.",
    ];
    userMessage += `\n\n${angles[Math.floor(Math.random() * angles.length)]}`;

    const completion = await openai.chat.completions.create(
      {
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 1.0,
      },
      { fetchOptions: { cache: "no-store" } },
    );

    const result = completion.choices[0].message.content;

    return NextResponse.json({ result, sources: allProblems.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Fikir üretilirken hata oluştu." },
      { status: 500 },
    );
  }
}
