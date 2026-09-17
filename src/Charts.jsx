import React, { useMemo } from "react";
import { C, rupiah, monthKeyShort } from "./ui.jsx";

/* Dibuat dengan SVG murni supaya tidak perlu library chart tambahan —
   bundle tetap ringan & build GitHub Pages tidak berubah. */

const nice = (v) => {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p) * p;
};
const shortRp = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".0", "") + "jt";
  if (a >= 1e3) return Math.round(n / 1e3) + "rb";
  return String(n);
};

/* ---------- Bar chart: Pemasukan vs Pengeluaran per bulan ---------- */
export function BarMasukKeluar({ rows }) {
  const data = rows || [];
  if (!data.length) return null;

  const W = Math.max(520, data.length * 68);
  const H = 240, padL = 52, padR = 12, padT = 14, padB = 34;
  const iw = W - padL - padR, ih = H - padT - padB;
  const max = nice(Math.max(1, ...data.map((r) => Math.max(r.masuk, r.keluar))));
  const step = iw / data.length;
  const bw = Math.min(16, step / 3);
  const y = (v) => padT + ih - (v / max) * ih;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: W > 520 ? W : undefined, height: "auto" }} role="img" aria-label="Grafik pemasukan dan pengeluaran per bulan">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(max * f)} y2={y(max * f)} stroke={C.lineSoft} strokeWidth="1" />
            <text x={padL - 8} y={y(max * f) + 3} textAnchor="end" fontSize="9" fill={C.inkSoft} fontFamily="IBM Plex Mono, monospace">{shortRp(max * f)}</text>
          </g>
        ))}
        {data.map((r, i) => {
          const cx = padL + i * step + step / 2;
          return (
            <g key={r.key}>
              <rect x={cx - bw - 2} y={y(r.masuk)} width={bw} height={Math.max(0, padT + ih - y(r.masuk))} fill={C.teal} rx="1">
                <title>{`${monthKeyShort(r.key)} · Masuk ${rupiah(r.masuk)}`}</title>
              </rect>
              <rect x={cx + 2} y={y(r.keluar)} width={bw} height={Math.max(0, padT + ih - y(r.keluar))} fill={C.rust} rx="1">
                <title>{`${monthKeyShort(r.key)} · Keluar ${rupiah(r.keluar)}`}</title>
              </rect>
              <text x={cx} y={H - 12} textAnchor="middle" fontSize="9" fill={C.inkSoft} fontFamily="IBM Plex Mono, monospace">{monthKeyShort(r.key)}</text>
            </g>
          );
        })}
        <line x1={padL} x2={W - padR} y1={padT + ih} y2={padT + ih} stroke={C.line} strokeWidth="1" />
      </svg>
    </div>
  );
}

/* ---------- Line: saldo kumulatif ---------- */
export function LineSaldo({ rows }) {
  const data = rows || [];
  if (data.length < 2) return null;
  const W = 520, H = 130, padL = 52, padR = 12, padT = 12, padB = 24;
  const iw = W - padL - padR, ih = H - padT - padB;
  const vals = data.map((r) => r.saldoKum);
  const max = nice(Math.max(1, ...vals)), min = Math.min(0, ...vals);
  const x = (i) => padL + (i / (data.length - 1)) * iw;
  const y = (v) => padT + ih - ((v - min) / (max - min || 1)) * ih;
  const path = data.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r.saldoKum)}`).join(" ");
  const area = `${path} L${x(data.length - 1)},${y(min)} L${x(0)},${y(min)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Grafik saldo kumulatif">
      <path d={area} fill={C.tealSoft} opacity="0.7" />
      <path d={path} fill="none" stroke={C.teal} strokeWidth="2" strokeLinejoin="round" />
      {data.map((r, i) => (
        <circle key={r.key} cx={x(i)} cy={y(r.saldoKum)} r="2.5" fill={C.card} stroke={C.teal} strokeWidth="1.5">
          <title>{`${monthKeyShort(r.key)} · Saldo ${rupiah(r.saldoKum)}`}</title>
        </circle>
      ))}
      <text x={padL - 8} y={y(max) + 3} textAnchor="end" fontSize="9" fill={C.inkSoft} fontFamily="IBM Plex Mono, monospace">{shortRp(max)}</text>
      <text x={padL - 8} y={y(min) + 3} textAnchor="end" fontSize="9" fill={C.inkSoft} fontFamily="IBM Plex Mono, monospace">{shortRp(min)}</text>
      <text x={padL} y={H - 6} fontSize="9" fill={C.inkSoft} fontFamily="IBM Plex Mono, monospace">{monthKeyShort(data[0].key)}</text>
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize="9" fill={C.inkSoft} fontFamily="IBM Plex Mono, monospace">{monthKeyShort(data[data.length - 1].key)}</text>
    </svg>
  );
}

/* ---------- Donut: pengeluaran per kebutuhan ---------- */
const SLICE_COLORS = [C.ochre, C.teal, C.rust, "#7A6A4F", "#8FA48C", "#C9A227", "#6B7FA3", "#A98C7B"];

export function DonutKebutuhan({ items, title }) {
  const data = (items || []).filter((d) => d.total > 0);
  const total = data.reduce((s, d) => s + d.total, 0);
  const slices = useMemo(() => {
    let acc = 0;
    return data.map((d, i) => {
      const frac = d.total / total;
      const s = acc; acc += frac;
      return { ...d, frac, start: s * 2 * Math.PI, end: acc * 2 * Math.PI, color: SLICE_COLORS[i % SLICE_COLORS.length] };
    });
  }, [data, total]);

  if (!total) return null;
  const S = 150, r = 62, ri = 38, c = S / 2;
  const arc = (a1, a2) => {
    const p = (ang, rad) => [c + rad * Math.sin(ang), c - rad * Math.cos(ang)];
    const large = a2 - a1 > Math.PI ? 1 : 0;
    const [x1, y1] = p(a1, r), [x2, y2] = p(a2, r), [x3, y3] = p(a2, ri), [x4, y4] = p(a1, ri);
    return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 ${large} 0 ${x4},${y4} Z`;
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg viewBox={`0 0 ${S} ${S}`} width="150" height="150" role="img" aria-label={title}>
        {slices.map((s) => (
          <path key={s.nama} d={slices.length === 1 ? "" : arc(s.start, s.end)} fill={s.color} stroke={C.card} strokeWidth="1">
            <title>{`${s.nama} · ${rupiah(s.total)}`}</title>
          </path>
        ))}
        {slices.length === 1 && (
          <>
            <circle cx={c} cy={c} r={r} fill={slices[0].color} />
            <circle cx={c} cy={c} r={ri} fill={C.card} />
          </>
        )}
        <text x={c} y={c - 2} textAnchor="middle" fontSize="10" fill={C.inkSoft} fontFamily="IBM Plex Mono, monospace">total</text>
        <text x={c} y={c + 11} textAnchor="middle" fontSize="11" fill={C.ink} fontFamily="IBM Plex Mono, monospace">{shortRp(total)}</text>
      </svg>
      <ul className="font-body text-xs flex flex-col gap-1.5 flex-1 min-w-[150px]">
        {slices.map((s) => (
          <li key={s.nama} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span style={{ color: C.ink }} className="flex-1 truncate">{s.nama}</span>
            <span className="font-mono" style={{ color: C.inkSoft }}>{Math.round(s.frac * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend() {
  return (
    <div className="flex items-center gap-4 font-body text-xs" style={{ color: C.inkSoft }}>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.teal }} /> Pemasukan</span>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.rust }} /> Pengeluaran</span>
    </div>
  );
}
