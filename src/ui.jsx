import React from "react";
import { Search } from "lucide-react";

/* ---------------------------------------------------------
   PALETTE & TYPE — "studio kanvas": tinta gelap di atas kertas,
   aksen ochre (cat sienna) & teal (cat tanah), garis rambut.
--------------------------------------------------------- */
export const C = {
  ink: "#211C16", inkSoft: "#5B5347", paper: "#F6F1E7", paperAlt: "#EDE5D3",
  card: "#FFFDF8", ochre: "#B9752B", ochreSoft: "#EFDCB9", teal: "#3C6E62",
  tealSoft: "#DCE9E2", rust: "#A8452B", rustSoft: "#F1D9CD", line: "#DED2B4",
  lineSoft: "#EAE1CB",
};

export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
.font-display{font-family:'Fraunces',serif;}
.font-body{font-family:'Space Grotesk',sans-serif;}
.font-mono{font-family:'IBM Plex Mono',monospace;}
`;

export const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
export const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const rupiah = (n) => "Rp" + (Number(n) || 0).toLocaleString("id-ID");

export function monthKeyLabel(key) {
  if (!key) return "—";
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_ID[m - 1]} ${y}`;
}
export function monthKeyShort(key) {
  if (!key) return "—";
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} '${String(y).slice(2)}`;
}
export function generateMonthRange(start, end) {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const out = [];
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

/* ---------------------------------------------------------
   UI PRIMITIVES
--------------------------------------------------------- */
export function Btn({ children, onClick, variant = "ghost", icon: Icon, type = "button", disabled }) {
  const styles = {
    solid: { background: C.ink, color: C.paper, border: `1px solid ${C.ink}` },
    ochre: { background: C.ochre, color: "#fff", border: `1px solid ${C.ochre}` },
    teal: { background: C.teal, color: "#fff", border: `1px solid ${C.teal}` },
    ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.line}` },
    danger: { background: "transparent", color: C.rust, border: `1px solid ${C.rust}` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="font-body inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm font-medium transition-opacity hover:opacity-75 disabled:opacity-40"
      style={styles[variant]}>
      {Icon && <Icon size={14} />}{children}
    </button>
  );
}
export function Field({ label, children, className = "" }) {
  return <label className={"flex flex-col gap-1 text-xs font-body " + className} style={{ color: C.inkSoft }}>{label}{children}</label>;
}
export function inputStyle() { return { background: C.card, border: `1px solid ${C.line}`, color: C.ink }; }
export function Input(props) { return <input {...props} className={"font-body px-2 py-1.5 rounded-sm text-sm outline-none focus:ring-1 w-full " + (props.className || "")} style={inputStyle()} />; }
export function Select({ children, ...props }) { return <select {...props} className={"font-body px-2 py-1.5 rounded-sm text-sm outline-none w-full " + (props.className || "")} style={inputStyle()}>{children}</select>; }
export function Card({ children, className = "" }) {
  return <div className={"rounded-md p-4 " + className} style={{ background: C.card, border: `1px solid ${C.line}` }}>{children}</div>;
}
export function Empty({ text }) {
  return <div className="font-body text-sm text-center py-8 rounded-sm" style={{ color: C.inkSoft, background: C.paperAlt, border: `1px dashed ${C.line}` }}>{text}</div>;
}
export function Badge({ children, tone = "ink" }) {
  const map = { ink: [C.paperAlt, C.ink], teal: [C.tealSoft, C.teal], rust: [C.rustSoft, C.rust], ochre: [C.ochreSoft, C.ochre] };
  const [bg, fg] = map[tone] || map.ink;
  return <span className="font-mono text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: bg, color: fg }}>{children}</span>;
}
export function SearchBox({ value, onChange, placeholder = "Cari..." }) {
  return (
    <div className="relative">
      <Search size={14} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: C.inkSoft, pointerEvents: "none" }} />
      <input value={value} onChange={onChange} placeholder={placeholder}
        className="font-body pl-7 pr-2 py-1.5 rounded-sm text-sm outline-none w-full"
        style={inputStyle()} />
    </div>
  );
}
