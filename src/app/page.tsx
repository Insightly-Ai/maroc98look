"use client";

import { useState, useRef, useCallback } from "react";

const FLAG_COLORS = { green: "#006233", red: "#C1272D", gold: "#B8860B" };

function StarField() {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360;
    const r = 38;
    const x = 50 + r * Math.cos((angle - 90) * (Math.PI / 180));
    const y = 50 + r * Math.sin((angle - 90) * (Math.PI / 180));
    return { x, y, delay: i * 0.08 };
  });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          transform: "translate(-50%,-50%)", color: FLAG_COLORS.gold,
          fontSize: "11px", opacity: 0.18,
          animation: `twinkle 2s ${s.delay}s ease-in-out infinite alternate`,
        }}>✦</div>
      ))}
    </div>
  );
}

function MoroccanStar({ size = 80, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i * 60 - 90) * (Math.PI / 180);
        const x = 50 + 40 * Math.cos(a);
        const y = 50 + 40 * Math.sin(a);
        return (
          <polygon key={i}
            points={`${x},${y} ${50 + 15 * Math.cos(a + 0.5)},${50 + 15 * Math.sin(a + 0.5)} ${50 + 15 * Math.cos(a - 0.5)},${50 + 15 * Math.sin(a - 0.5)}`}
            fill={FLAG_COLORS.gold} opacity="0.9"
          />
        );
      })}
    </svg>
  );
}

export default function Marokko98Look() {
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultVariant, setResultVariant] = useState<"solo" | "team" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setResultUrl(null);
    setError(null);
    setImageMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const transform = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResultUrl(null);
    setResultVariant(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, imageMime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fout");
      setResultUrl(data.imageUrl);
      setResultVariant(data.variant || "solo");
    } catch {
      setError("Er ging iets mis. Probeer opnieuw! 🇲🇦");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #00200f 0%, #003d1a 40%, #001a0a 100%)",
      fontFamily: "Georgia, serif",
      color: "#e8f5e0",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes twinkle { from { opacity: 0.1; transform: translate(-50%,-50%) scale(0.8); } to { opacity: 0.4; transform: translate(-50%,-50%) scale(1.2); } }
        @keyframes pulse-gold { 0%,100% { box-shadow: 0 0 0 0 rgba(184,134,11,0.4); } 50% { box-shadow: 0 0 30px 8px rgba(184,134,11,0.15); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .upload-zone:hover { border-color: ${FLAG_COLORS.gold} !important; background: rgba(0,98,51,0.3) !important; }
        .btn-main:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 40px rgba(0,98,51,0.6) !important; }
        .result-card { animation: fadeInUp 0.6s ease forwards; }
      `}</style>

      <StarField />
      <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: `repeating-linear-gradient(45deg, ${FLAG_COLORS.gold} 0, ${FLAG_COLORS.gold} 1px, transparent 0, transparent 50%)`, backgroundSize: "30px 30px", pointerEvents: "none" }} />
      <div style={{ height: "5px", background: `linear-gradient(90deg, ${FLAG_COLORS.red}, #e63946, ${FLAG_COLORS.red})` }} />

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 20px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <MoroccanStar size={40} />
            <div style={{
              fontSize: "clamp(28px, 6vw, 52px)", fontWeight: 900,
              background: `linear-gradient(135deg, #fff 0%, ${FLAG_COLORS.gold} 50%, #fff 100%)`,
              backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", animation: "shimmer 4s linear infinite", letterSpacing: "-1px",
            }}>MAROC 98</div>
            <MoroccanStar size={40} />
          </div>
          <div style={{ fontSize: "clamp(13px, 2.5vw, 17px)", color: FLAG_COLORS.gold, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "12px", opacity: 0.9 }}>
            Look Generator
          </div>
          <p style={{ fontWeight: 300, fontSize: "15px", color: "rgba(232,245,224,0.7)", maxWidth: "440px", margin: "0 auto", lineHeight: 1.7 }}>
            Upload je foto en zie jezelf als een legendarische Marokkaanse voetballer uit het iconische WK 1998 tijdperk. 🇲🇦⭐
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "16px", alignItems: "center" }}>
            <img src="/maroc98-shirt.webp" alt="Marokko 98 shirt" style={{ height: "64px", borderRadius: "6px", border: `1px solid rgba(184,134,11,0.3)`, opacity: 0.85 }} />
            <div style={{ fontSize: "12px", color: "rgba(232,245,224,0.45)", letterSpacing: "1px" }}>
              Het iconische Puma shirt
            </div>
          </div>
        </div>

        <div className="upload-zone" onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? FLAG_COLORS.gold : "rgba(0,98,51,0.6)"}`,
            borderRadius: "16px", padding: image ? "20px" : "60px 20px",
            textAlign: "center", cursor: "pointer",
            background: dragOver ? "rgba(0,98,51,0.3)" : "rgba(0,50,20,0.4)",
            backdropFilter: "blur(10px)", transition: "all 0.3s ease",
            marginBottom: "24px", position: "relative", overflow: "hidden",
          }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
          {image ? (
            <div>
              <img src={image} alt="Geüpload" style={{ maxHeight: "280px", maxWidth: "100%", borderRadius: "10px", border: `2px solid ${FLAG_COLORS.green}`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", display: "block", margin: "0 auto 12px" }} />
              <p style={{ color: FLAG_COLORS.gold, fontSize: "13px", margin: 0 }}>Klik om een andere foto te kiezen</p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: "52px", marginBottom: "16px" }}>🦁</div>
              <p style={{ fontSize: "18px", color: "#c8e6c0", marginBottom: "8px" }}>Sleep je foto hierheen</p>
              <p style={{ fontSize: "13px", color: "rgba(232,245,224,0.5)", margin: 0 }}>of klik om te uploaden • JPG, PNG, WEBP</p>
            </>
          )}
        </div>

        {image && !resultUrl && (
          <button className="btn-main" onClick={transform} disabled={loading} style={{
            width: "100%", padding: "18px",
            background: loading ? "rgba(0,98,51,0.4)" : `linear-gradient(135deg, ${FLAG_COLORS.green} 0%, #008a45 50%, ${FLAG_COLORS.green} 100%)`,
            border: `1px solid ${loading ? "rgba(0,98,51,0.3)" : FLAG_COLORS.green}`,
            borderRadius: "12px", color: "#fff", fontSize: "18px", fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer", transition: "all 0.3s ease",
            letterSpacing: "1px", animation: !loading ? "pulse-gold 3s ease-in-out infinite" : "none",
            marginBottom: "32px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
          }}>
            {loading
              ? <><span style={{ display: "inline-block", width: "20px", height: "20px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin-slow 0.8s linear infinite" }} />Even geduld — jouw Maroc 98 look wordt gegenereerd...</>
              : <>🇲🇦 Transformeer naar Maroc 98 speler!</>}
          </button>
        )}

        {error && (
          <div style={{ background: "rgba(193,39,45,0.15)", border: "1px solid rgba(193,39,45,0.4)", borderRadius: "12px", padding: "16px 20px", color: "#ff8a8a", fontSize: "15px", marginBottom: "24px", textAlign: "center" }}>
            {error}
          </div>
        )}

        {resultUrl && (
          <div className="result-card" style={{
            background: "linear-gradient(135deg, rgba(0,50,20,0.8) 0%, rgba(0,30,12,0.9) 100%)",
            border: `1px solid ${FLAG_COLORS.gold}`, borderRadius: "16px", padding: "24px",
            position: "relative", overflow: "hidden", backdropFilter: "blur(20px)",
            boxShadow: `0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(184,134,11,0.2)`,
          }}>
            <MoroccanStar size={30} style={{ position: "absolute", top: 12, left: 12, opacity: 0.4 }} />
            <MoroccanStar size={30} style={{ position: "absolute", top: 12, right: 12, opacity: 0.4 }} />
            <div style={{ textAlign: "center", fontSize: "13px", color: FLAG_COLORS.gold, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "16px", opacity: 0.8 }}>
              {resultVariant === "team" ? "🎉 Surprise! Jouw Teamfoto ⭐" : "Jouw Maroc 98 Look ⭐"}
            </div>
            <img src={resultUrl} alt="Jouw Maroc 98 look" style={{ width: "100%", borderRadius: "12px", border: `2px solid ${FLAG_COLORS.green}`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", display: "block" }} />
            <div style={{ marginTop: "20px", display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href={resultUrl} download="maroc98look.jpg" style={{ background: FLAG_COLORS.green, border: "none", borderRadius: "8px", color: "#fff", padding: "10px 24px", fontSize: "13px", cursor: "pointer", letterSpacing: "1px", textDecoration: "none", display: "inline-block" }}>
                ⬇ Download
              </a>
              <button onClick={() => { setImage(null); setImageBase64(null); setResultUrl(null); setResultVariant(null); }}
                style={{ background: "transparent", border: `1px solid rgba(184,134,11,0.4)`, borderRadius: "8px", color: FLAG_COLORS.gold, padding: "10px 24px", fontSize: "13px", cursor: "pointer", letterSpacing: "1px" }}>
                Probeer opnieuw
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "60px", color: "rgba(232,245,224,0.25)", fontSize: "12px", letterSpacing: "2px" }}>
          <MoroccanStar size={16} style={{ display: "inline-block", verticalAlign: "middle", margin: "0 8px", opacity: 0.4 }} />
          MAROC 98 · WK FRANKRIJK · LES LIONS DE L&apos;ATLAS
          <MoroccanStar size={16} style={{ display: "inline-block", verticalAlign: "middle", margin: "0 8px", opacity: 0.4 }} />
        </div>
      </div>

      <div style={{ height: "5px", background: `linear-gradient(90deg, ${FLAG_COLORS.red}, #e63946, ${FLAG_COLORS.red})`, position: "absolute", bottom: 0, left: 0, right: 0 }} />
    </div>
  );
}
