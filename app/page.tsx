"use client";

import { useEffect, useState } from "react";

interface SavedIdea {
  id: string;
  text: string;
  date: string;
  score: string | null;
  decision: string | null;
}

const STORAGE_KEY = "startup-idea-history";

// Sonuç metninden skor ve kararı çıkarmaya çalış (sadece liste görünümü için)
function extractScore(text: string): string | null {
  const match = text.match(/Skor[:\s]*([\d]+\s*\/?\s*10)/i);
  return match ? match[1].replace(/\s/g, "") : null;
}

function extractDecision(text: string): string | null {
  const match = text.match(/Karar[:\s]*([A-Z]+)/i);
  return match ? match[1].toUpperCase() : null;
}

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);

  // Ana fikir için derinlemesine analiz state'i
  const [mainAnalysis, setMainAnalysis] = useState("");
  const [mainAnalysisLoading, setMainAnalysisLoading] = useState(false);

  // Geçmiş öğeleri için analiz state'i (her id için ayrı sonuç tutulur)
  const [historyAnalyses, setHistoryAnalyses] = useState<
    Record<string, string>
  >({});
  const [historyAnalysisLoadingId, setHistoryAnalysisLoadingId] = useState<
    string | null
  >(null);

  const [history, setHistory] = useState<SavedIdea[]>([]);

  // Sayfa client'ta mount olduktan sonra geçmişi localStorage'dan yükle
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHistory(JSON.parse(saved));
      }
    } catch {
      // localStorage okunamazsa boş listeyle devam et
    }
  }, []);

  // Geçmişi localStorage'a kaydet
  const saveHistory = (updated: SavedIdea[]) => {
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const generateIdea = async () => {
    setLoading(true);
    setIdea("");
    setMainAnalysis("");

    try {
      const res = await fetch("/api/generate-idea", {
        method: "POST",
      });
      const data = await res.json();

      if (data.error) {
        setIdea("Hata: " + data.error);
      } else {
        setIdea(data.result);

        const newEntry: SavedIdea = {
          id: Date.now().toString(),
          text: data.result,
          date: new Date().toLocaleString("tr-TR"),
          score: extractScore(data.result),
          decision: extractDecision(data.result),
        };

        const updated = [newEntry, ...history].slice(0, 50); // en fazla 50 kayıt
        saveHistory(updated);
      }
    } catch {
      setIdea("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Derinlemesine analiz isteği (ortak fonksiyon)
  const runDeepAnalysis = async (
    ideaText: string,
    onResult: (text: string) => void,
  ) => {
    try {
      const res = await fetch("/api/deep-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: ideaText }),
      });
      const data = await res.json();

      if (data.error) {
        onResult("Hata: " + data.error);
      } else {
        onResult(data.result);
      }
    } catch {
      onResult("Analiz sırasında bir hata oluştu.");
    }
  };

  const analyzeMainIdea = async () => {
    setMainAnalysisLoading(true);
    setMainAnalysis("");
    await runDeepAnalysis(idea, setMainAnalysis);
    setMainAnalysisLoading(false);
  };

  const analyzeHistoryItem = async (item: SavedIdea) => {
    setHistoryAnalysisLoadingId(item.id);
    await runDeepAnalysis(item.text, (result) => {
      setHistoryAnalyses((prev) => ({ ...prev, [item.id]: result }));
    });
    setHistoryAnalysisLoadingId(null);
  };

  const clearHistory = () => {
    if (confirm("Tüm geçmiş silinsin mi?")) {
      saveHistory([]);
      setHistoryAnalyses({});
    }
  };

  const decisionColor = (decision: string | null) => {
    if (decision === "BUILD") return "bg-green-100 text-green-700";
    if (decision === "TEST") return "bg-yellow-100 text-yellow-700";
    if (decision === "SKIP") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 mt-4 text-gray-800">
        Startup Fikir Üretici
      </h1>

      <button
        onClick={generateIdea}
        disabled={loading}
        className="bg-black text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Üretiliyor..." : "Fikir Üret"}
      </button>

      {idea && (
        <div className="mt-8 max-w-xl w-full bg-white rounded-lg shadow p-6 whitespace-pre-line text-gray-800 leading-relaxed">
          {idea}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={analyzeMainIdea}
              disabled={mainAnalysisLoading}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {mainAnalysisLoading
                ? "Rakipler araştırılıyor..."
                : "Derinlemesine Analiz Et"}
            </button>

            {mainAnalysis && (
              <div className="mt-4 bg-blue-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-line">
                {mainAnalysis}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Geçmiş fikirler */}
      {history.length > 0 && (
        <div className="mt-12 max-w-xl w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-700">
              Geçmiş Fikirler ({history.length})
            </h2>
            <button
              onClick={clearHistory}
              className="text-sm text-red-600 hover:underline"
            >
              Geçmişi Temizle
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <details
                key={item.id}
                className="bg-white rounded-lg shadow border border-gray-100"
              >
                <summary className="cursor-pointer p-3 flex items-center justify-between gap-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  <span>{item.date}</span>
                  <div className="flex items-center gap-2">
                    {item.score && (
                      <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {item.score}
                      </span>
                    )}
                    {item.decision && (
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${decisionColor(
                          item.decision,
                        )}`}
                      >
                        {item.decision}
                      </span>
                    )}
                  </div>
                </summary>
                <div className="p-3 pt-0 whitespace-pre-line text-sm text-gray-700 border-t border-gray-100 mt-1">
                  {item.text}

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => analyzeHistoryItem(item)}
                      disabled={historyAnalysisLoadingId === item.id}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {historyAnalysisLoadingId === item.id
                        ? "Rakipler araştırılıyor..."
                        : "Derinlemesine Analiz Et"}
                    </button>

                    {historyAnalyses[item.id] && (
                      <div className="mt-3 bg-blue-50 rounded-lg p-3 text-xs text-gray-800 whitespace-pre-line">
                        {historyAnalyses[item.id]}
                      </div>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
