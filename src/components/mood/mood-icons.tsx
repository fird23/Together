import type { CSSProperties } from "react";
import { MOOD_HUES } from "@/lib/moods";

type Eyes = "dot" | "arc" | "closed" | "wide" | "wink" | "star" | "dash" | "down";
type Mouth = "smile" | "open" | "smirk" | "flat" | "frown" | "o" | "wavy" | "tongue" | "tiny";
type Brows = "angry" | "worried" | "flat";
type Extra = "blush" | "sweat" | "tear" | "zzz" | "sparkle" | "question" | "dots" | "heart";
type Face = { eyes: Eyes; mouth: Mouth; brows?: Brows; extra?: Extra[] };

/** Лица для новых настроений собираются из общих частей: глаза, рот, брови и мелкие детали. */
const FACES: Record<string, Face> = {
  happy: { eyes: "arc", mouth: "smile", extra: ["blush"] },
  joyful: { eyes: "dot", mouth: "open" },
  excited: { eyes: "star", mouth: "open" },
  inspired: { eyes: "star", mouth: "smile", extra: ["sparkle"] },
  grateful: { eyes: "closed", mouth: "smile", extra: ["blush"] },
  proud: { eyes: "arc", mouth: "smirk", extra: ["sparkle"] },
  energetic: { eyes: "wide", mouth: "open", extra: ["sparkle"] },
  cozy: { eyes: "closed", mouth: "tiny", extra: ["blush"] },
  tender: { eyes: "closed", mouth: "smile", extra: ["blush", "heart"] },
  confident: { eyes: "dot", mouth: "smirk" },
  thoughtful: { eyes: "dot", mouth: "flat", extra: ["dots"] },
  bored: { eyes: "dash", mouth: "flat" },
  sleepy: { eyes: "down", mouth: "o", extra: ["zzz"] },
  curious: { eyes: "dot", mouth: "smirk", extra: ["question"] },
  surprised: { eyes: "wide", mouth: "o" },
  confused: { eyes: "dot", mouth: "wavy", extra: ["question"] },
  nostalgic: { eyes: "closed", mouth: "smirk" },
  indifferent: { eyes: "dot", mouth: "flat" },
  focused: { eyes: "dot", mouth: "flat", brows: "flat" },
  annoyed: { eyes: "dot", mouth: "flat", brows: "angry" },
  lonely: { eyes: "dot", mouth: "frown", brows: "worried" },
  hurt: { eyes: "dot", mouth: "frown", brows: "worried", extra: ["tear"] },
  disappointed: { eyes: "dash", mouth: "frown" },
  exhausted: { eyes: "down", mouth: "wavy", extra: ["sweat"] },
  overwhelmed: { eyes: "wide", mouth: "wavy", extra: ["sweat"] },
  afraid: { eyes: "wide", mouth: "o", brows: "worried", extra: ["sweat"] },
  ashamed: { eyes: "down", mouth: "wavy", extra: ["blush"] },
  jealous: { eyes: "dot", mouth: "smirk", brows: "angry" },
  guilty: { eyes: "dot", mouth: "wavy", brows: "worried" },
  sick: { eyes: "dash", mouth: "wavy", extra: ["sweat"] },
};

function GeneratedFace({ face, hue }: { face: Face; hue: string }) {
  const ink = { stroke: "var(--c-ink)", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as CSSProperties;
  const dot = { fill: "var(--c-ink)" } as CSSProperties;
  const white = { fill: "var(--c-paper)", stroke: "var(--c-ink)", strokeWidth: 1.5 } as CSSProperties;
  const star = (cx: number) => `M${cx} 12.600l1.400 3 3 1.400-3 1.400-1.400 3-1.400-3-3-1.400 3-1.400z`;
  const { eyes, mouth, brows, extra = [] } = face;
  return (
    <>
      {eyes === "dot" && (<><circle cx="14" cy="17.500" r="1.900" style={dot} /><circle cx="26" cy="17.500" r="1.900" style={dot} /></>)}
      {eyes === "arc" && <path d="M11.500 17q2.500-4 5 0M23.500 17q2.500-4 5 0" style={ink} />}
      {eyes === "closed" && <path d="M11.500 17.500q2.500 2.500 5 0M23.500 17.500q2.500 2.500 5 0" style={ink} />}
      {eyes === "down" && <path d="M11.500 18q2.500 2 5 0M23.500 18q2.500 2 5 0" style={{ ...ink, strokeWidth: 1.700 }} />}
      {eyes === "dash" && <path d="M11.500 18h5M23.500 18h5" style={ink} />}
      {eyes === "wide" && (<><circle cx="14" cy="17" r="3.600" style={white} /><circle cx="26" cy="17" r="3.600" style={white} /><circle cx="14" cy="17" r="1.400" style={dot} /><circle cx="26" cy="17" r="1.400" style={dot} /></>)}
      {eyes === "wink" && (<><path d="M11.500 18q2.500-3.500 5 0" style={ink} /><circle cx="26" cy="17.500" r="1.900" style={dot} /></>)}
      {eyes === "star" && (<><path d={star(14)} style={{ fill: "var(--c-ink)" }} /><path d={star(26)} style={{ fill: "var(--c-ink)" }} /></>)}

      {brows === "angry" && <path d="M10.500 13.500l6 2.500M29.500 13.500l-6 2.500" style={{ ...ink, strokeWidth: 2 }} />}
      {brows === "worried" && <path d="M10.500 14.500l6-2.500M29.500 14.500l-6-2.500" style={{ ...ink, strokeWidth: 1.700 }} />}
      {brows === "flat" && <path d="M10.500 12.500h6M23.500 12.500h6" style={{ ...ink, strokeWidth: 1.700 }} />}

      {mouth === "smile" && <path d="M12.500 24q7.500 7 15 0" style={ink} />}
      {mouth === "open" && <path d="M12.500 23h15a7.500 7.500 0 0 1-15 0z" style={{ ...dot, stroke: "var(--c-ink)", strokeWidth: 1.500, strokeLinejoin: "round" }} />}
      {mouth === "smirk" && <path d="M14 26q6 3 12-2" style={ink} />}
      {mouth === "flat" && <path d="M15 27h10" style={ink} />}
      {mouth === "frown" && <path d="M14 29q6-6 12 0" style={ink} />}
      {mouth === "o" && <ellipse cx="20" cy="27" rx="2.400" ry="3" style={white} />}
      {mouth === "wavy" && <path d="M13 27q1.800-2.600 3.600 0t3.600 0 3.600 0 3.600 0" style={{ ...ink, strokeWidth: 1.700 }} />}
      {mouth === "tongue" && (<><path d="M12.500 24q7.500 7 15 0" style={ink} /><path d="M17 28.500v2a3 3 0 0 0 6 0v-2" style={{ fill: hue, stroke: "var(--c-ink)", strokeWidth: 1.400 }} /></>)}
      {mouth === "tiny" && <path d="M16.500 26q3.500 3 7 0" style={ink} />}

      {extra.includes("blush") && (<><circle cx="10.500" cy="24" r="2.300" style={{ fill: hue, opacity: 0.55 }} /><circle cx="29.500" cy="24" r="2.300" style={{ fill: hue, opacity: 0.55 }} /></>)}
      {extra.includes("sweat") && <path d="M31 9.500q2.600 3.400 0 5.600-2.600-2.200 0-5.600z" style={{ fill: "#7EB6E8", stroke: "var(--c-ink)", strokeWidth: 1 }} />}
      {extra.includes("tear") && <path d="M14 21q2.200 3 0 5-2.200-2 0-5z" style={{ fill: "#7EB6E8", stroke: "var(--c-ink)", strokeWidth: 1 }} />}
      {extra.includes("zzz") && <path d="M28 8h5l-5 6h5" style={{ ...ink, strokeWidth: 1.600 }} />}
      {extra.includes("sparkle") && <path d="M31 7v6M28 10h6" style={{ ...ink, strokeWidth: 1.600 }} />}
      {extra.includes("question") && <text x="29" y="13" fontSize="10" fontWeight="700" style={dot}>?</text>}
      {extra.includes("dots") && <path d="M28 10h.1M31 10h.1M34 10h.1" style={{ ...ink, strokeWidth: 2.200 }} />}
      {extra.includes("heart") && <path d="M31 12.500c-2.600-1.800-3.200-3-3.200-3.900a1.600 1.600 0 0 1 3.200-.500 1.600 1.600 0 0 1 3.200.500c0 .900-.600 2.100-3.200 3.900z" style={{ fill: hue }} />}
    </>
  );
}

/** Свои лица настроения: одинаково выглядят на любом устройстве и красятся под тему. */
const HANDWRITTEN = new Set(["great", "good", "angry", "love", "miss", "playful", "calm", "tired", "sad", "stressed"]);

export function MoodIcon({ mood, size = 28 }: { mood: string; size?: number }) {
  const hue = MOOD_HUES[mood] ?? "#8B90A0";
  const ink = { stroke: "var(--c-ink)", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as CSSProperties;
  const dot = { fill: "var(--c-ink)" } as CSSProperties;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="18" style={{ fill: `color-mix(in srgb, ${hue} 42%, var(--c-paper))`, stroke: hue, strokeWidth: 1.5 }} />
      {mood === "great" && (<><path d="M11.500 17q2.500-4 5 0M23.500 17q2.500-4 5 0" style={ink} /><path d="M12 23h16a8 8 0 0 1-16 0z" style={{ ...dot, stroke: "var(--c-ink)", strokeWidth: 1.5, strokeLinejoin: "round" }} /><circle cx="9.500" cy="22" r="2" style={{ fill: hue, opacity: 0.55 }} /><circle cx="30.500" cy="22" r="2" style={{ fill: hue, opacity: 0.55 }} /></>)}
      {mood === "good" && (<><circle cx="14" cy="17" r="1.900" style={dot} /><circle cx="26" cy="17" r="1.900" style={dot} /><path d="M12.500 24q7.500 7 15 0" style={ink} /></>)}
      {mood === "angry" && (<><path d="M10.500 13.500l6 2.500M29.500 13.500l-6 2.500" style={{ ...ink, strokeWidth: 2.100 }} /><circle cx="14" cy="19" r="1.900" style={dot} /><circle cx="26" cy="19" r="1.900" style={dot} /><path d="M14 28.500q6-4.500 12 0" style={ink} /></>)}
      {mood === "love" && (<><path d="M14 21.500C10 18.600 9 16.800 9 15.300a2.500 2.500 0 0 1 5-.8 2.500 2.500 0 0 1 5 .8c0 1.500-1 3.300-5 6.200z" style={{ fill: hue }} /><path d="M26 21.500c-4-2.900-5-4.700-5-6.200a2.500 2.500 0 0 1 5-.8 2.500 2.500 0 0 1 5 .8c0 1.500-1 3.300-5 6.200z" style={{ fill: hue }} /><path d="M13.500 26q6.500 6 13 0" style={ink} /></>)}
      {mood === "miss" && (<><path d="M9.500 13.500l6-2M30.500 13.500l-6-2" style={{ ...ink, strokeWidth: 1.700 }} /><circle cx="14" cy="19" r="3.600" style={dot} /><circle cx="26" cy="19" r="3.600" style={dot} /><circle cx="15.200" cy="17.700" r="1.200" style={{ fill: "var(--c-paper)" }} /><circle cx="27.200" cy="17.700" r="1.200" style={{ fill: "var(--c-paper)" }} /><path d="M16.500 28.500q3.500-3 7 0" style={ink} /><path transform="translate(-2.500 4.500)" d="M31.500 6.500c-2.600-1.800-3.400-3.200-3.400-4.300a1.700 1.700 0 0 1 3.400-.6 1.700 1.700 0 0 1 3.400.6c0 1.100-.8 2.500-3.400 4.300z" style={{ fill: hue }} /></>)}
      {mood === "playful" && (<><path d="M10.500 18q2.800-3.800 5.600 0" style={ink} /><circle cx="26" cy="17" r="2" style={dot} /><path d="M12 23.500q8 7 16 0z" style={{ fill: "var(--c-paper)", stroke: "var(--c-ink)", strokeWidth: 1.600, strokeLinejoin: "round" }} /><path d="M21 27.200v2.400a2.700 2.700 0 0 0 5.400 0v-3" style={{ fill: "#F08A9E", stroke: "var(--c-ink)", strokeWidth: 1.300, strokeLinejoin: "round" }} /></>)}
      {mood === "calm" && (<><path d="M11.500 18q2.500 2.500 5 0M23.500 18q2.500 2.500 5 0" style={ink} /><path d="M16 25.500q4 3 8 0" style={ink} /></>)}
      {mood === "tired" && (<><path d="M11.500 18h5M23.500 18h5" style={ink} /><path d="M16.500 26.500h7" style={ink} /><path d="M29 7.500h5l-5 6h5" style={{ ...ink, strokeWidth: 1.600 }} /></>)}
      {mood === "sad" && (<><circle cx="14" cy="17" r="1.900" style={dot} /><circle cx="26" cy="17" r="1.900" style={dot} /><path d="M13.500 28q6.500-6.500 13 0" style={ink} /><path d="M29 21q2.600 3.400 0 5.600-2.600-2.200 0-5.600z" style={{ fill: "#6C8FD6" }} /></>)}
      {mood === "stressed" && (<><circle cx="14" cy="17" r="3.600" style={{ fill: "var(--c-paper)", stroke: "var(--c-ink)", strokeWidth: 1.500 }} /><circle cx="26" cy="17" r="3.600" style={{ fill: "var(--c-paper)", stroke: "var(--c-ink)", strokeWidth: 1.500 }} /><circle cx="14.500" cy="17.500" r="1.200" style={dot} /><circle cx="25.500" cy="17.500" r="1.200" style={dot} /><path d="M13 27.500q2.500-3 5 0t5 0 4 0" style={ink} /><path d="M32 8q3 4.200 0 6.400-3-2.200 0-6.400z" style={{ fill: "#6C8FD6" }} /></>)}
      {FACES[mood] && <GeneratedFace face={FACES[mood]} hue={hue} />}
      {!FACES[mood] && !HANDWRITTEN.has(mood) && <GeneratedFace face={{ eyes: "dot", mouth: "flat" }} hue={hue} />}
    </svg>
  );
}
