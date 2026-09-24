import React, { useMemo, useState } from "react";
import { Receipt, Plus, Pencil, Trash2, Check, X, ExternalLink, ArrowDownLeft, ArrowUpRight, Search, UploadCloud } from "lucide-react";
import {
  C, Btn, Field, Input, Select, Card, Empty, Badge,
  rupiah, todayISO, uid, monthKeyLabel,
} from "./ui.jsx";
import { KEBUTUHAN_MASUK, KEBUTUHAN_KELUAR, monthOf, DANA_DARURAT, totalSetoranAnggota, buildFinance } from "./finance.js";
import { syncToSheet, bulkSyncToSheet } from "./sheetSync.js";

const blank = () => ({
  tanggal: todayISO(), jenis: "Pengeluaran", kebutuhan: "",
  nominal: "", keterangan: "", bukti: "",
});

function JenisToggle({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {["Pemasukan", "Pengeluaran"].map((j) => {
        const on = value === j;
        const col = j === "Pemasukan" ? C.teal : C.rust;
        return (
          <button key={j} type="button" onClick={() => onChange(j)}
            className="font-body text-xs px-2.5 py-1.5 rounded-sm border transition-opacity hover:opacity-80 flex items-center gap-1"
            style={on ? { background: col, color: "#fff", borderColor: col } : { background: "transparent", color: C.inkSoft, borderColor: C.line }}>
            {j === "Pemasukan" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}{j}
          </button>
        );
      })}
    </div>
  );
}

function KebutuhanInput({ jenis, value, onChange }) {
  const opsi = jenis === "Pemasukan" ? KEBUTUHAN_MASUK : KEBUTUHAN_KELUAR;
  const isCustom = value !== "" && !opsi.includes(value);
  const [manual, setManual] = useState(isCustom);
  return manual ? (
    <div className="flex gap-1">
      <Input value={value} placeholder="Tulis kebutuhan" onChange={(e) => onChange(e.target.value)} />
      <Btn icon={X} onClick={() => { setManual(false); onChange(""); }} />
    </div>
  ) : (
    <Select value={value} onChange={(e) => { if (e.target.value === "__custom") { setManual(true); onChange(""); } else onChange(e.target.value); }}>
      <option value="">Pilih kebutuhan</option>
      {opsi.map((o) => <option key={o} value={o}>{o}</option>)}
      <option value="__custom">+ Tulis sendiri…</option>
    </Select>
  );
}

function BuktiCell({ url }) {
  if (!url) return <span style={{ color: C.line }}>—</span>;
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-body text-xs inline-flex items-center gap-1 hover:opacity-70" style={{ color: C.ochre }}>
      <ExternalLink size={12} /> Nota
    </a>
  );
}

export default function TransaksiView({ transaksi, setTransaksi, anggota = [], kas }) {
  const [draft, setDraft] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [fJenis, setFJenis] = useState("Semua");
  const [fBulan, setFBulan] = useState("Semua");
  const [q, setQ] = useState("");
  const [syncState, setSyncState] = useState("idle"); // idle | sending | sent | error

  const bulanOpsi = useMemo(
    () => Array.from(new Set(transaksi.map((t) => monthOf(t.tanggal)).filter(Boolean))).sort().reverse(),
    [transaksi]
  );

  const shown = useMemo(() => {
    return transaksi
      .filter((t) => (fJenis === "Semua" ? true : (t.jenis || "Pemasukan") === fJenis))
      .filter((t) => (fBulan === "Semua" ? true : monthOf(t.tanggal) === fBulan))
      .filter((t) => {
        if (!q.trim()) return true;
        const s = `${t.kebutuhan} ${t.keterangan}`.toLowerCase();
        return s.includes(q.trim().toLowerCase());
      })
      .sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""));
  }, [transaksi, fJenis, fBulan, q]);

  const sum = useMemo(() => {
    let masuk = 0, keluar = 0;
    shown.forEach((t) => {
      const n = Number(t.nominal) || 0;
      if ((t.jenis || "Pemasukan") === "Pengeluaran") keluar += n; else masuk += n;
    });
    return { masuk, keluar, selisih: masuk - keluar };
  }, [shown]);

  async function syncAllToSheet() {
    setSyncState("sending");
    try {
      const finance = buildFinance({ kas, anggota, transaksi });
      const anggotaPayload = anggota.map((a) => ({ ...a, totalSetoran: totalSetoranAnggota(kas, a.id) }));
      const kasRows = finance.rows.map((r) => ({ ...r, bulan: r.key }));
      await bulkSyncToSheet({ transaksi, anggota: anggotaPayload, kasRows, danaDarurat: DANA_DARURAT });
      setSyncState("sent");
    } catch {
      setSyncState("error");
    }
    setTimeout(() => setSyncState("idle"), 4000);
  }

  const totalSemua = useMemo(() => {
    let masuk = 0, keluar = 0;
    transaksi.forEach((t) => {
      const n = Number(t.nominal) || 0;
      if ((t.jenis || "Pemasukan") === "Pengeluaran") keluar += n; else masuk += n;
    });
    return masuk - keluar;
  }, [transaksi]);

  const periodeLabel = fBulan === "Semua" ? "semua bulan" : monthKeyLabel(fBulan);

  function add() {
    if (!draft.nominal || Number(draft.nominal) <= 0) return;
    if (!draft.kebutuhan.trim()) return;
    const item = { id: uid(), ...draft, nominal: Number(draft.nominal) };
    setTransaksi([...transaksi, item]);
    syncToSheet("add", item);
    setDraft({ ...blank(), jenis: draft.jenis });
  }
  function saveEdit() {
    const item = { ...editDraft, nominal: Number(editDraft.nominal) || 0 };
    setTransaksi(transaksi.map((t) => (t.id === editId ? item : t)));
    syncToSheet("edit", item);
    setEditId(null); setEditDraft(null);
  }
  function remove(id) {
    if (!window.confirm("Hapus transaksi ini? Tidak bisa dibatalkan.")) return;
    setTransaksi(transaksi.filter((t) => t.id !== id));
    syncToSheet("delete", { id });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Receipt size={20} style={{ color: C.ochre }} />
        <div className="flex-1">
          <h2 className="font-display text-xl" style={{ color: C.ink }}>Transaksi</h2>
          <p className="font-body text-xs" style={{ color: C.inkSoft }}>Catatan pemasukan &amp; pengeluaran Sub Rupa — otomatis masuk ke rekap Kas &amp; grafik Beranda</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Btn variant="ghost" icon={UploadCloud} onClick={syncAllToSheet} disabled={syncState === "sending"}>
            {syncState === "sending" ? "Mengirim…" : "Sinkronkan Semua ke Sheets"}
          </Btn>
          {syncState === "sent" && <span className="font-body text-[11px]" style={{ color: C.teal }}>Terkirim — cek Sheets dalam beberapa detik</span>}
          {syncState === "error" && <span className="font-body text-[11px]" style={{ color: C.rust }}>Gagal kirim — cek URL di sheetSync.js</span>}
        </div>
      </div>

      {/* FORM TAMBAH */}
      <Card>
        <div className="flex flex-col gap-3">
          <Field label="Jenis"><JenisToggle value={draft.jenis} onChange={(v) => setDraft({ ...draft, jenis: v, kebutuhan: "" })} /></Field>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Field label="Tanggal"><Input type="date" value={draft.tanggal} onChange={(e) => setDraft({ ...draft, tanggal: e.target.value })} /></Field>
            <Field label="Kebutuhan"><KebutuhanInput jenis={draft.jenis} value={draft.kebutuhan} onChange={(v) => setDraft({ ...draft, kebutuhan: v })} /></Field>
            <Field label="Nominal (Rp)"><Input type="number" min="0" placeholder="0" value={draft.nominal} onChange={(e) => setDraft({ ...draft, nominal: e.target.value })} /></Field>
            <Field label="Link bukti/nota (Drive)"><Input placeholder="tempel link Google Drive" value={draft.bukti} onChange={(e) => setDraft({ ...draft, bukti: e.target.value })} /></Field>
          </div>
          <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
            <Field label="Keterangan"><Input placeholder="mis. beli cat akrilik untuk pameran" value={draft.keterangan} onChange={(e) => setDraft({ ...draft, keterangan: e.target.value })} /></Field>
            <Btn variant="ochre" icon={Plus} onClick={add}>Tambah Transaksi</Btn>
          </div>
          <p className="font-body text-[11px]" style={{ color: C.inkSoft }}>
            Upload foto nota ke folder Drive Sub Rupa dulu, lalu tempel link-nya di sini (set jadi “siapa saja yang punya link”).
          </p>
        </div>
      </Card>

      {/* FILTER + RINGKASAN */}
      <Card className="!py-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Field label="Jenis">
            <Select value={fJenis} onChange={(e) => setFJenis(e.target.value)}>
              <option>Semua</option><option>Pemasukan</option><option>Pengeluaran</option>
            </Select>
          </Field>
          <Field label="Bulan">
            <Select value={fBulan} onChange={(e) => setFBulan(e.target.value)}>
              <option value="Semua">Semua bulan</option>
              {bulanOpsi.map((b) => <option key={b} value={b}>{monthKeyLabel(b)}</option>)}
            </Select>
          </Field>
          <Field label="Cari"><Input value={q} placeholder="kebutuhan / keterangan" onChange={(e) => setQ(e.target.value)} /></Field>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card className="!p-3">
          <p className="font-body text-[11px]" style={{ color: C.inkSoft }}>Pemasukan</p>
          <p className="font-mono text-sm md:text-base mt-0.5" style={{ color: C.teal }}>{rupiah(sum.masuk)}</p>
          <p className="font-body text-[10px] mt-0.5" style={{ color: C.inkSoft }}>{periodeLabel}</p>
        </Card>
        <Card className="!p-3">
          <p className="font-body text-[11px]" style={{ color: C.inkSoft }}>Pengeluaran</p>
          <p className="font-mono text-sm md:text-base mt-0.5" style={{ color: C.rust }}>{rupiah(sum.keluar)}</p>
          <p className="font-body text-[10px] mt-0.5" style={{ color: C.inkSoft }}>{periodeLabel}</p>
        </Card>
        <Card className="!p-3">
          <p className="font-body text-[11px]" style={{ color: C.inkSoft }}>Total Seluruh Transaksi</p>
          <p className="font-mono text-sm md:text-base mt-0.5" style={{ color: C.ink }}>{rupiah(totalSemua + DANA_DARURAT)}</p>
          <p className="font-body text-[10px] mt-0.5" style={{ color: C.inkSoft }}>
            {rupiah(totalSemua)} + dana darurat {rupiah(DANA_DARURAT)}
          </p>
        </Card>
      </div>

      {/* TABEL */}
      {shown.length === 0 ? (
        <Empty text={transaksi.length === 0 ? "Belum ada transaksi. Catat pemasukan atau pengeluaran pertama lewat form di atas." : "Tidak ada transaksi yang cocok dengan filter."} />
      ) : (
        <div className="overflow-x-auto rounded-md" style={{ border: `1px solid ${C.line}` }}>
          <table className="w-full text-sm font-body" style={{ background: C.card }}>
            <thead><tr style={{ background: C.paperAlt }}>
              {["Tanggal", "Jenis", "Kebutuhan", "Nominal", "Keterangan", "Bukti", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap" style={{ color: C.inkSoft }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {shown.map((t) => {
                const keluar = (t.jenis || "Pemasukan") === "Pengeluaran";
                const ed = editId === t.id;
                return (
                  <tr key={t.id} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                      {ed ? <Input type="date" value={editDraft.tanggal} onChange={(e) => setEditDraft({ ...editDraft, tanggal: e.target.value })} /> : t.tanggal}
                    </td>
                    <td className="px-3 py-2">
                      {ed ? <JenisToggle value={editDraft.jenis} onChange={(v) => setEditDraft({ ...editDraft, jenis: v })} />
                          : <Badge tone={keluar ? "rust" : "teal"}>{keluar ? "Keluar" : "Masuk"}</Badge>}
                    </td>
                    <td className="px-3 py-2">
                      {ed ? <KebutuhanInput jenis={editDraft.jenis} value={editDraft.kebutuhan} onChange={(v) => setEditDraft({ ...editDraft, kebutuhan: v })} /> : (t.kebutuhan || "—")}
                    </td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: keluar ? C.rust : C.teal }}>
                      {ed ? <Input type="number" value={editDraft.nominal} onChange={(e) => setEditDraft({ ...editDraft, nominal: e.target.value })} />
                          : `${keluar ? "−" : "+"} ${rupiah(t.nominal)}`}
                    </td>
                    <td className="px-3 py-2" style={{ color: C.inkSoft }}>
                      {ed ? <Input value={editDraft.keterangan} onChange={(e) => setEditDraft({ ...editDraft, keterangan: e.target.value })} /> : (t.keterangan || "—")}
                    </td>
                    <td className="px-3 py-2">
                      {ed ? <Input value={editDraft.bukti} placeholder="link Drive" onChange={(e) => setEditDraft({ ...editDraft, bukti: e.target.value })} /> : <BuktiCell url={t.bukti} />}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        {ed ? (
                          <><Btn variant="ochre" icon={Check} onClick={saveEdit}>Simpan</Btn><Btn icon={X} onClick={() => setEditId(null)} /></>
                        ) : (
                          <><Btn icon={Pencil} onClick={() => { setEditId(t.id); setEditDraft({ ...t }); }} /><Btn variant="danger" icon={Trash2} onClick={() => remove(t.id)} /></>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
