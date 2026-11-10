import type { CSSProperties } from "react";

export const MOOD_HUES: Record<string, string> = {
  great: "#E9A93B", good: "#6FAE6B", angry: "#D8584E", calm: "#6C8FD6", tired: "#9A82C9", sad: "#D9708E", stressed: "#D98B5B",
  love: "#E5648A", miss: "#B36BC9", playful: "#4FB0A5",
};

/** Свои лица настроения: одинаково выглядят на любом устройстве и красятся под тему. */
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
    </svg>
  );
}
