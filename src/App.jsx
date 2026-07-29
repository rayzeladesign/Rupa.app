import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Users, Package, ArrowLeftRight, Wallet,
  CalendarDays, Plus, Pencil, Trash2, Check, X, Clock, AlertTriangle,
  Loader2, Menu, ChevronLeft, ChevronRight, ClipboardCheck, LogOut
} from "lucide-react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase.js";
import Login from "./Login.jsx";
import InstallButton from "./InstallButton.jsx";
import logo from "./assets/logo-256.png";

/* ---------------------------------------------------------
   PALETTE & TYPE — "studio kanvas": tinta gelap di atas kertas,
   aksen ochre (cat sienna) & teal (cat tanah), garis rambut.
--------------------------------------------------------- */
const C = {
  ink: "#211C16", inkSoft: "#5B5347", paper: "#F6F1E7", paperAlt: "#EDE5D3",
  card: "#FFFDF8", ochre: "#B9752B", ochreSoft: "#EFDCB9", teal: "#3C6E62",
  tealSoft: "#DCE9E2", rust: "#A8452B", rustSoft: "#F1D9CD", line: "#DED2B4",
  lineSoft: "#EAE1CB",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
.font-display{font-family:'Fraunces',serif;}
.font-body{font-family:'Space Grotesk',sans-serif;}
.font-mono{font-family:'IBM Plex Mono',monospace;}
`;

const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const rupiah = (n) => "Rp" + (n || 0).toLocaleString("id-ID");

function monthKeyLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS_ID[m - 1]} ${y}`;
}
function generateMonthRange(start, end) {
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

const SEED_INVENTARIS = [
  ["Kain kanvas","Bahan",8,"lembar"],["Kain satin putih","Bahan",2,"lembar"],
  ["Kain kostum","Bahan",13,"lembar"],["Double tip","Alat Tulis/Lem",1,"buah"],
  ["Gunting","Alat",2,"buah"],["Selotip busa","Alat Tulis/Lem",1,"buah"],
  ["Benang senar","Bahan Kerajinan",1,"gulung"],["Lem stik","Alat Tulis/Lem",1,"buah"],
  ["Lem fox","Alat Tulis/Lem",2,"pack"],["Benang wol merah","Bahan Kerajinan",1,"gulung"],
  ["Nail glue","Alat Tulis/Lem",1,"pack"],["Kantong plastik kecil","Perlengkapan",1,"pack"],
  ["Benang kasur","Bahan Kerajinan",1,"gulung"],["Lampu lilin","Properti",3,"buah"],
  ["Tutup minuman","Bahan Kerajinan",1,"pack"],["Kuas","Alat Lukis",13,"buah"],
  ["Krayon","Alat Lukis",1,"pak"],["Tutup tepak","Perlengkapan",3,"buah"],
  ["Palet","Alat Lukis",1,"buah"],["Payung","Properti",1,"buah"],
  ["Penghapus papan tulis","Alat Tulis",1,"buah"],["Acrylic cat","Alat Lukis",1,"pak"],
  ["Dusgrib dan seisinya","Perlengkapan",1,"set"],["Washi tape","Alat Tulis/Lem",1,"pak"],
  ["Spidol Flamingo","Alat Tulis",1,"pak"],["Gayung","Perlengkapan",1,"buah"],
  ["Pensil warna","Alat Lukis",1,"pak"],["Hand sanitizer","Perlengkapan",1,"botol"],
  ["HVS","Alat Tulis",1,"pak"],["Water color paper","Bahan",1,"pak"],
  ["Kertas warna dan kokoru","Bahan",1,"pak"],["Keranjang","Perlengkapan",1,"buah"],
  ["Container kecil","Perlengkapan",1,"buah"],["Container besar","Perlengkapan",1,"buah"],
  ["Pemotong kertas","Alat",1,"buah"],["Pemotong kertas kecil","Alat",1,"buah"],
  ["Peralatan clay pahat","Alat Kerajinan",1,"pak"],["Clay","Bahan Kerajinan",1,"pak"],
  ["Pilox","Alat Lukis",3,"buah"],["Cat minyak","Alat Lukis",1,"plastik"],
  ["Stand lukis","Properti",4,"buah"],["Pasir warna","Bahan Kerajinan",1,"plastik"],
  ["Lukisan cardboard","Karya Seni",11,"buah"],["Lukisan canvas","Karya Seni",32,"buah"],
  ["Lukisan kaca","Karya Seni",1,"buah"],
].map(([nama, kategori, jumlah, satuan], i) => ({
  id: uid(), kode: `INV-${String(i + 1).padStart(3, "0")}`, nama, kategori,
  jumlah, satuan, kondisi: "Baik", lokasi: "", catatan: "",
}));

const DEFAULT_KAS = { config: { startMonth: "2026-08", endMonth: "2027-04" }, setoran: {}, bulanan: {} };

/* ---------------------------------------------------------
   STORAGE HOOK — Firestore realtime, semua data bersama
   supaya kasub/wakasub/humas lihat data yang sama, live.
--------------------------------------------------------- */
const KEYS = { anggota: "sr-anggota", inventaris: "sr-inventaris", peminjaman: "sr-peminjaman", kas: "sr-kas", agenda: "sr-agenda", absensi: "sr-absensi" };
const COLLECTION = "subrupa-data";

function useSharedStore() {
  const [data, setData] = useState({ anggota: [], inventaris: [], peminjaman: [], kas: DEFAULT_KAS, agenda: [], absensi: {} });
  const [loaded, setLoaded] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubs = Object.keys(KEYS).map((k) => {
      const ref = doc(db, COLLECTION, KEYS[k]);
      return onSnapshot(
        ref,
        (snap) => {
          if (snap.exists() && snap.data().json) {
            setData((prev) => ({ ...prev, [k]: JSON.parse(snap.data().json) }));
          } else if (k === "inventaris") {
            setData((prev) => ({ ...prev, inventaris: SEED_INVENTARIS }));
            setDoc(ref, { json: JSON.stringify(SEED_INVENTARIS) }).catch(() => {});
          }
          setLoaded((prev) => ({ ...prev, [k]: true }));
          setError(null);
        },
        (e) => { setError("Gagal konek ke Firebase. Cek koneksi internet / konfigurasi."); setLoaded((prev) => ({ ...prev, [k]: true })); }
      );
    });
    return () => unsubs.forEach((u) => u());
  }, []);

  const loading = Object.keys(KEYS).some((k) => !loaded[k]);

  const save = useCallback(async (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
    try {
      await setDoc(doc(db, COLLECTION, KEYS[key]), { json: JSON.stringify(value) });
      setError(null);
    } catch (e) { setError(`Gagal menyimpan ${key}. Cek koneksi.`); }
  }, []);

  return { data, save, loading, error };
}

/* ---------------------------------------------------------
   UI PRIMITIVES
--------------------------------------------------------- */
function Btn({ children, onClick, variant = "ghost", icon: Icon, type = "button", disabled }) {
  const styles = {
    solid: { background: C.ink, color: C.paper, border: `1px solid ${C.ink}` },
    ochre: { background: C.ochre, color: "#fff", border: `1px solid ${C.ochre}` },
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
function Field({ label, children }) {
  return <label className="flex flex-col gap-1 text-xs font-body" style={{ color: C.inkSoft }}>{label}{children}</label>;
}
function inputStyle() { return { background: C.card, border: `1px solid ${C.line}`, color: C.ink }; }
function Input(props) { return <input {...props} className={"font-body px-2 py-1.5 rounded-sm text-sm outline-none focus:ring-1 " + (props.className || "")} style={inputStyle()} />; }
function Select({ children, ...props }) { return <select {...props} className="font-body px-2 py-1.5 rounded-sm text-sm outline-none" style={inputStyle()}>{children}</select>; }
function Card({ children, className = "" }) {
  return <div className={"rounded-md p-4 " + className} style={{ background: C.card, border: `1px solid ${C.line}` }}>{children}</div>;
}
function Empty({ text }) {
  return <div className="font-body text-sm text-center py-8 rounded-sm" style={{ color: C.inkSoft, background: C.paperAlt, border: `1px dashed ${C.line}` }}>{text}</div>;
}
function Badge({ children, tone = "ink" }) {
  const map = { ink: [C.paperAlt, C.ink], teal: [C.tealSoft, C.teal], rust: [C.rustSoft, C.rust], ochre: [C.ochreSoft, C.ochre] };
  const [bg, fg] = map[tone];
  return <span className="font-mono text-[11px] px-2 py-0.5 rounded-full" style={{ background: bg, color: fg }}>{children}</span>;
}

/* ---------------------------------------------------------
   GENERIC CRUD SECTION (Anggota, Pengurus, Agenda)
--------------------------------------------------------- */
function emptyRow(columns) {
  const o = {};
  columns.forEach((c) => (o[c.key] = c.default ?? ""));
  return o;
}
function CrudSection({ title, subtitle, icon: Icon, columns, rows, onChange, extraCol, sortKey }) {
  const [draft, setDraft] = useState(emptyRow(columns));
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => String(a[sortKey] || "").localeCompare(String(b[sortKey] || "")));
  }, [rows, sortKey]);

  function add() {
    if (!draft[columns[0].key]) return;
    onChange([...rows, { id: uid(), ...draft }]);
    setDraft(emptyRow(columns));
  }
  function startEdit(row) { setEditId(row.id); setEditDraft({ ...row }); }
  function saveEdit() { onChange(rows.map((r) => (r.id === editId ? editDraft : r))); setEditId(null); }
  function remove(id) { onChange(rows.filter((r) => r.id !== id)); }

  function renderInput(col, val, setVal) {
    if (col.type === "select") return <Select value={val} onChange={(e) => setVal(e.target.value)}><option value="">—</option>{col.options.map((o) => <option key={o} value={o}>{o}</option>)}</Select>;
    return <Input type={col.type || "text"} value={val} placeholder={col.label} onChange={(e) => setVal(e.target.value)} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Icon size={20} style={{ color: C.ochre }} />
        <div>
          <h2 className="font-display text-xl" style={{ color: C.ink }}>{title}</h2>
          <p className="font-body text-xs" style={{ color: C.inkSoft }}>{subtitle}</p>
        </div>
      </div>

      <Card>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(100px,1fr)) auto` }}>
          {columns.map((c) => <Field key={c.key} label={c.label}>{renderInput(c, draft[c.key], (v) => setDraft({ ...draft, [c.key]: v }))}</Field>)}
          <div className="flex items-end"><Btn variant="ochre" icon={Plus} onClick={add}>Tambah</Btn></div>
        </div>
      </Card>

      {sorted.length === 0 ? <Empty text={`Belum ada data. Tambahkan ${title.toLowerCase()} pertama lewat form di atas.`} /> : (
        <div className="overflow-x-auto rounded-md" style={{ border: `1px solid ${C.line}` }}>
          <table className="w-full text-sm font-body" style={{ background: C.card }}>
            <thead><tr style={{ background: C.paperAlt }}>
              {columns.map((c) => <th key={c.key} className="text-left px-3 py-2 font-medium" style={{ color: C.inkSoft }}>{c.label}</th>)}
              {extraCol && <th className="text-left px-3 py-2 font-medium" style={{ color: C.inkSoft }}>{extraCol.label}</th>}
              <th className="px-3 py-2"></th>
            </tr></thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2">
                      {editId === row.id ? renderInput(c, editDraft[c.key], (v) => setEditDraft({ ...editDraft, [c.key]: v })) : (row[c.key] || <span style={{ color: C.line }}>—</span>)}
                    </td>
                  ))}
                  {extraCol && <td className="px-3 py-2">{extraCol.render(row)}</td>}
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      {editId === row.id ? (
                        <><Btn variant="ochre" icon={Check} onClick={saveEdit}>Simpan</Btn><Btn icon={X} onClick={() => setEditId(null)}>Batal</Btn></>
                      ) : (
                        <><Btn icon={Pencil} onClick={() => startEdit(row)} /><Btn variant="danger" icon={Trash2} onClick={() => remove(row.id)} /></>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   INVENTARIS
--------------------------------------------------------- */
function InventarisView({ inventaris, setInventaris, peminjaman }) {
  const dipinjamMap = useMemo(() => {
    const m = {};
    peminjaman.filter((p) => p.status === "Dipinjam").forEach((p) => { m[p.barangId] = (m[p.barangId] || 0) + Number(p.jumlah || 0); });
    return m;
  }, [peminjaman]);

  const columns = [
    { key: "nama", label: "Nama Barang" },
    { key: "kategori", label: "Kategori" },
    { key: "jumlah", label: "Jumlah", type: "number", default: 1 },
    { key: "satuan", label: "Satuan" },
    { key: "kondisi", label: "Kondisi", type: "select", options: ["Baik", "Rusak Ringan", "Rusak Berat", "Hilang"], default: "Baik" },
    { key: "lokasi", label: "Lokasi" },
  ];

  return (
    <CrudSection
      title="Inventaris" subtitle="Master data barang milik Sub Rupa" icon={Package}
      columns={columns} rows={inventaris} onChange={setInventaris} sortKey="nama"
      extraCol={{ label: "Tersedia", render: (row) => {
        const tersedia = Number(row.jumlah || 0) - (dipinjamMap[row.id] || 0);
        return <Badge tone={tersedia <= 0 ? "rust" : "teal"}>{tersedia}/{row.jumlah}</Badge>;
      }}}
    />
  );
}

/* ---------------------------------------------------------
   PEMINJAMAN
--------------------------------------------------------- */
function PeminjamanView({ peminjaman, setPeminjaman, inventaris, anggota }) {
  const [form, setForm] = useState({ barangId: "", jumlah: 1, namaPeminjam: "", keperluan: "", rencanaKembali: "" });
  const [kembaliFor, setKembaliFor] = useState(null);
  const [kondisiKembali, setKondisiKembali] = useState("Baik");

  const dipinjamMap = useMemo(() => {
    const m = {};
    peminjaman.filter((p) => p.status === "Dipinjam").forEach((p) => { m[p.barangId] = (m[p.barangId] || 0) + Number(p.jumlah || 0); });
    return m;
  }, [peminjaman]);

  function submit() {
    if (!form.barangId || !form.namaPeminjam) return;
    setPeminjaman([...peminjaman, { id: uid(), ...form, tglPinjam: todayISO(), tglKembaliAktual: "", status: "Menunggu", kondisiKembali: "" }]);
    setForm({ barangId: "", jumlah: 1, namaPeminjam: "", keperluan: "", rencanaKembali: "" });
  }
  function approve(id) { setPeminjaman(peminjaman.map((p) => (p.id === id ? { ...p, status: "Dipinjam", tglPinjam: todayISO() } : p))); }
  function tolak(id) { setPeminjaman(peminjaman.map((p) => (p.id === id ? { ...p, status: "Ditolak" } : p))); }
  function confirmKembali() {
    setPeminjaman(peminjaman.map((p) => (p.id === kembaliFor ? { ...p, status: "Dikembalikan", tglKembaliAktual: todayISO(), kondisiKembali } : p)));
    setKembaliFor(null); setKondisiKembali("Baik");
  }

  const barangName = (id) => inventaris.find((b) => b.id === id)?.nama || "—";
  const isTerlambat = (p) => p.status === "Dipinjam" && p.rencanaKembali && p.rencanaKembali < todayISO();

  const sorted = [...peminjaman].sort((a, b) => (b.tglPinjam || "").localeCompare(a.tglPinjam || ""));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ArrowLeftRight size={20} style={{ color: C.ochre }} />
        <div><h2 className="font-display text-xl" style={{ color: C.ink }}>Peminjaman</h2>
        <p className="font-body text-xs" style={{ color: C.inkSoft }}>Ajukan &amp; kelola peminjaman barang inventaris</p></div>
      </div>

      <Card>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <Field label="Barang">
            <Select value={form.barangId} onChange={(e) => setForm({ ...form, barangId: e.target.value })}>
              <option value="">Pilih barang</option>
              {inventaris.map((b) => { const tersedia = Number(b.jumlah) - (dipinjamMap[b.id] || 0); return <option key={b.id} value={b.id} disabled={tersedia <= 0}>{b.nama} ({tersedia} tersedia)</option>; })}
            </Select>
          </Field>
          <Field label="Jumlah"><Input type="number" min="1" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} /></Field>
          <Field label="Peminjam">
            <Input value={form.namaPeminjam} onChange={(e) => setForm({ ...form, namaPeminjam: e.target.value })} placeholder="Nama peminjam" />
          </Field>
          <Field label="Rencana Kembali"><Input type="date" value={form.rencanaKembali} onChange={(e) => setForm({ ...form, rencanaKembali: e.target.value })} /></Field>
          <Btn variant="ochre" icon={Plus} onClick={submit}>Ajukan</Btn>
        </div>
        <div className="mt-2"><Field label="Keperluan"><Input value={form.keperluan} onChange={(e) => setForm({ ...form, keperluan: e.target.value })} placeholder="mis. properti pameran" /></Field></div>
      </Card>

      {sorted.length === 0 ? <Empty text="Belum ada pengajuan peminjaman." /> : (
        <div className="overflow-x-auto rounded-md" style={{ border: `1px solid ${C.line}` }}>
          <table className="w-full text-sm font-body" style={{ background: C.card }}>
            <thead><tr style={{ background: C.paperAlt }}>
              {["Barang","Jml","Peminjam","Keperluan","Rencana Kembali","Status","Aksi"].map((h) => <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: C.inkSoft }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                  <td className="px-3 py-2">{barangName(p.barangId)}</td>
                  <td className="px-3 py-2 font-mono">{p.jumlah}</td>
                  <td className="px-3 py-2">{p.namaPeminjam}</td>
                  <td className="px-3 py-2" style={{ color: C.inkSoft }}>{p.keperluan || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.rencanaKembali || "—"}</td>
                  <td className="px-3 py-2">
                    {isTerlambat(p) ? <Badge tone="rust">Terlambat</Badge> :
                     p.status === "Dipinjam" ? <Badge tone="ochre">Dipinjam</Badge> :
                     p.status === "Menunggu" ? <Badge tone="ink">Menunggu</Badge> :
                     p.status === "Dikembalikan" ? <Badge tone="teal">Dikembalikan</Badge> : <Badge tone="rust">Ditolak</Badge>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      {p.status === "Menunggu" && <><Btn variant="ochre" icon={Check} onClick={() => approve(p.id)}>Setujui</Btn><Btn variant="danger" icon={X} onClick={() => tolak(p.id)}>Tolak</Btn></>}
                      {p.status === "Dipinjam" && <Btn variant="ghost" onClick={() => setKembaliFor(p.id)}>Kembalikan</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {kembaliFor && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(33,28,22,0.4)" }}>
          <Card className="w-80">
            <h3 className="font-display text-lg mb-3" style={{ color: C.ink }}>Konfirmasi Pengembalian</h3>
            <Field label="Kondisi barang saat kembali">
              <Select value={kondisiKembali} onChange={(e) => setKondisiKembali(e.target.value)}>
                <option>Baik</option><option>Rusak Ringan</option><option>Rusak Berat</option><option>Hilang</option>
              </Select>
            </Field>
            <div className="flex gap-2 mt-4 justify-end">
              <Btn onClick={() => setKembaliFor(null)}>Batal</Btn>
              <Btn variant="ochre" icon={Check} onClick={confirmKembali}>Konfirmasi</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   KAS
--------------------------------------------------------- */
const IURAN_MINGGUAN = 3000;
const DANA_DARURAT = 200000;

function KasView({ kas, setKas, anggota }) {
  const months = useMemo(() => generateMonthRange(kas.config.startMonth, kas.config.endMonth), [kas.config]);
  const [tab, setTab] = useState("mingguan");
  const [monthIdx, setMonthIdx] = useState(() => {
    const idx = months.indexOf(months.find((m) => m >= (todayISO().slice(0, 7))));
    return idx >= 0 ? idx : 0;
  });
  const monthKey = months[monthIdx] || months[0];

  function setStatus(anggotaId, week, value) {
    const setoran = { ...kas.setoran };
    setoran[anggotaId] = { ...(setoran[anggotaId] || {}) };
    setoran[anggotaId][monthKey] = { ...(setoran[anggotaId][monthKey] || {}) };
    setoran[anggotaId][monthKey][week] = value;
    setKas({ ...kas, setoran });
  }
  function setBulanan(key, field, value) {
    const bulanan = { ...kas.bulanan, [key]: { ...(kas.bulanan[key] || {}), [field]: value } };
    setKas({ ...kas, bulanan });
  }
  function setConfig(field, value) { setKas({ ...kas, config: { ...kas.config, [field]: value } }); }

  const monthlyMasukAnggota = (key) => {
    let total = 0;
    anggota.forEach((a) => {
      const weeks = kas.setoran[a.id]?.[key] || {};
      total += Object.values(weeks).reduce((s, v) => s + (Number(v) || 0), 0);
    });
    return total;
  };

  const rekapRows = useMemo(() => {
    let saldoKum = 0;
    return months.map((key) => {
      const masukAnggota = monthlyMasukAnggota(key);
      const b = kas.bulanan[key] || {};
      const masukLain = Number(b.masukLain || 0);
      const keluar = Number(b.keluar || 0);
      const saldoBulan = masukAnggota + masukLain - keluar;
      saldoKum += saldoBulan;
      return { key, masukAnggota, masukLain, keluar, saldoBulan, saldoKum, bendahara: b.bendahara || "", keterangan: b.keterangan || "" };
    });
  }, [kas, anggota, months]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Wallet size={20} style={{ color: C.ochre }} />
          <div><h2 className="font-display text-xl" style={{ color: C.ink }}>Kas</h2>
          <p className="font-body text-xs" style={{ color: C.inkSoft }}>Isi jumlah setoran tiap minggu secara manual (cth: {IURAN_MINGGUAN.toLocaleString("id-ID")}) &middot; periode {monthKeyLabel(months[0])} – {monthKeyLabel(months[months.length - 1])}</p></div>
        </div>
        <div className="flex gap-1">
          <Btn variant={tab === "mingguan" ? "ochre" : "ghost"} onClick={() => setTab("mingguan")}>Setoran Mingguan</Btn>
          <Btn variant={tab === "bulanan" ? "ochre" : "ghost"} onClick={() => setTab("bulanan")}>Rekap Bulanan</Btn>
          <Btn variant={tab === "config" ? "ochre" : "ghost"} onClick={() => setTab("config")}>Periode</Btn>
        </div>
      </div>

      <Card>
        <p className="font-body text-xs" style={{ color: C.inkSoft }}>Dana darurat (terpisah dari saldo kas, harus tetap utuh): <b className="font-mono" style={{ color: C.ink }}>{rupiah(DANA_DARURAT)}</b></p>
      </Card>

      {tab === "config" && (
        <Card>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <Field label="Bulan Mulai"><Input type="month" value={kas.config.startMonth} onChange={(e) => setConfig("startMonth", e.target.value)} /></Field>
            <Field label="Bulan Selesai"><Input type="month" value={kas.config.endMonth} onChange={(e) => setConfig("endMonth", e.target.value)} /></Field>
          </div>
          <p className="font-body text-xs mt-2" style={{ color: C.inkSoft }}>Ubah rentang ini kapan saja — daftar minggu &amp; rekap bulanan otomatis menyesuaikan, tidak perlu tambah kolom manual.</p>
        </Card>
      )}

      {tab === "mingguan" && (
        <>
          {anggota.length === 0 ? <Empty text="Tambahkan anggota dulu di menu Anggota sebelum mencatat setoran kas." /> : (
            <>
              <div className="flex items-center gap-2">
                <Btn icon={ChevronLeft} onClick={() => setMonthIdx(Math.max(0, monthIdx - 1))} />
                <span className="font-display text-lg px-2" style={{ color: C.ink }}>{monthKeyLabel(monthKey)}</span>
                <Btn icon={ChevronRight} onClick={() => setMonthIdx(Math.min(months.length - 1, monthIdx + 1))} />
              </div>
              <div className="overflow-x-auto rounded-md" style={{ border: `1px solid ${C.line}` }}>
                <table className="w-full text-sm font-body" style={{ background: C.card }}>
                  <thead><tr style={{ background: C.paperAlt }}>
                    <th className="text-left px-3 py-2 font-medium" style={{ color: C.inkSoft }}>Anggota</th>
                    {[1, 2, 3, 4].map((w) => <th key={w} className="px-3 py-2 font-medium" style={{ color: C.inkSoft }}>Mgu {w}</th>)}
                    <th className="px-3 py-2 font-medium" style={{ color: C.inkSoft }}>Total Bayar</th>
                  </tr></thead>
                  <tbody>
                    {anggota.map((a) => {
                      const weeks = kas.setoran[a.id]?.[monthKey] || {};
                      const bayarAnggota = Object.values(kas.setoran[a.id] || {}).reduce((s, wk) => s + Object.values(wk).reduce((ss, v) => ss + (Number(v) || 0), 0), 0);
                      return (
                        <tr key={a.id} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                          <td className="px-3 py-2">{a.nama}</td>
                          {[1, 2, 3, 4].map((w) => (
                            <td key={w} className="px-2 py-2">
                              <Input type="number" min="0" placeholder="0" value={weeks[w] || ""} onChange={(e) => setStatus(a.id, w, e.target.value)} />
                            </td>
                          ))}
                          <td className="px-3 py-2 font-mono text-xs">{rupiah(bayarAnggota)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {tab === "bulanan" && (
        <div className="overflow-x-auto rounded-md" style={{ border: `1px solid ${C.line}` }}>
          <table className="w-full text-sm font-body" style={{ background: C.card }}>
            <thead><tr style={{ background: C.paperAlt }}>
              {["Bulan","Kas Masuk Anggota","Kas Masuk Lain","Pengeluaran","Saldo Bulan","Saldo Kumulatif","Bendahara/PJ"].map((h) => <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: C.inkSoft }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rekapRows.map((r) => (
                <tr key={r.key} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                  <td className="px-3 py-2">{monthKeyLabel(r.key)}</td>
                  <td className="px-3 py-2 font-mono">{rupiah(r.masukAnggota)}</td>
                  <td className="px-2 py-2 w-28"><Input type="number" value={r.masukLain} onChange={(e) => setBulanan(r.key, "masukLain", e.target.value)} /></td>
                  <td className="px-2 py-2 w-28"><Input type="number" value={r.keluar} onChange={(e) => setBulanan(r.key, "keluar", e.target.value)} /></td>
                  <td className="px-3 py-2 font-mono">{rupiah(r.saldoBulan)}</td>
                  <td className="px-3 py-2 font-mono font-medium" style={{ color: C.teal }}>{rupiah(r.saldoKum)}</td>
                  <td className="px-2 py-2 w-32"><Input value={r.bendahara} onChange={(e) => setBulanan(r.key, "bendahara", e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   DASHBOARD
--------------------------------------------------------- */
function DashboardView({ data, goto, session }) {
  const today = todayISO();
  const agendaHariIni = data.agenda.filter((a) => a.tanggal === today).sort((a, b) => (a.waktu || "").localeCompare(b.waktu || ""));
  const barangDipinjam = data.peminjaman.filter((p) => p.status === "Dipinjam");
  const barangTerlambat = barangDipinjam.filter((p) => p.rencanaKembali && p.rencanaKembali < today);
  const pengajuanMenunggu = data.peminjaman.filter((p) => p.status === "Menunggu");

  const months = generateMonthRange(data.kas.config.startMonth, data.kas.config.endMonth);
  const curMonth = months.find((m) => m >= today.slice(0, 7)) || months[months.length - 1];
  let masukBulanIni = 0;
  data.anggota.forEach((a) => {
    const weeks = data.kas.setoran[a.id]?.[curMonth] || {};
    masukBulanIni += Object.values(weeks).reduce((s, v) => s + (Number(v) || 0), 0);
  });
  const belumLunasCount = data.anggota.filter((a) => {
    const weeks = data.kas.setoran[a.id]?.[curMonth] || {};
    const total = Object.values(weeks).reduce((s, v) => s + (Number(v) || 0), 0);
    return total === 0;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider" style={{ color: C.ochre }}>{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <h1 className="font-display text-3xl mt-1" style={{ color: C.ink }}>Selamat datang, {session.name}</h1>
        <p className="font-body text-sm mt-1" style={{ color: C.inkSoft }}>Ringkasan koordinasi hari ini &middot; login sebagai {session.role}</p>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-3"><CalendarDays size={16} style={{ color: C.ochre }} /><h3 className="font-display text-base" style={{ color: C.ink }}>Agenda Hari Ini</h3></div>
        {agendaHariIni.length === 0 ? <p className="font-body text-sm" style={{ color: C.inkSoft }}>Tidak ada agenda terjadwal hari ini.</p> : (
          <div className="flex flex-col gap-2">
            {agendaHariIni.map((a) => (
              <div key={a.id} className="flex items-start gap-3 pb-2" style={{ borderBottom: `1px solid ${C.lineSoft}` }}>
                <span className="font-mono text-xs mt-0.5 shrink-0" style={{ color: C.ochre }}>{a.waktu || "--:--"}</span>
                <div><p className="font-body text-sm font-medium" style={{ color: C.ink }}>{a.judul}</p>
                <p className="font-body text-xs" style={{ color: C.inkSoft }}>{a.lokasi}{a.pj ? ` · PJ: ${a.pj}` : ""}</p></div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-2"><Wallet size={16} style={{ color: C.ochre }} /><h3 className="font-display text-base" style={{ color: C.ink }}>Kas Bulan Ini</h3></div>
          <p className="font-display text-2xl" style={{ color: C.teal }}>{rupiah(masukBulanIni)}</p>
          <p className="font-body text-xs mt-1" style={{ color: C.inkSoft }}>{curMonth ? monthKeyLabel(curMonth) : "—"} · {belumLunasCount} anggota belum setor bulan ini</p>
          <div className="mt-3"><Btn onClick={() => goto("kas")}>Buka Kas →</Btn></div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-2"><Package size={16} style={{ color: C.ochre }} /><h3 className="font-display text-base" style={{ color: C.ink }}>Inventaris</h3></div>
          <p className="font-display text-2xl" style={{ color: barangTerlambat.length ? C.rust : C.ink }}>{barangDipinjam.length}<span className="font-body text-sm" style={{ color: C.inkSoft }}> sedang dipinjam</span></p>
          <p className="font-body text-xs mt-1" style={{ color: C.inkSoft }}>{barangTerlambat.length} telat kembali · {pengajuanMenunggu.length} pengajuan menunggu</p>
          <div className="mt-3"><Btn onClick={() => goto("peminjaman")}>Buka Peminjaman →</Btn></div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-2"><Users size={16} style={{ color: C.ochre }} /><h3 className="font-display text-base" style={{ color: C.ink }}>Anggota</h3></div>
          <p className="font-display text-2xl" style={{ color: C.ink }}>{data.anggota.length}</p>
          <p className="font-body text-xs mt-1" style={{ color: C.inkSoft }}>anggota aktif tercatat</p>
          <div className="mt-3"><Btn onClick={() => goto("anggota")}>Buka Anggota →</Btn></div>
        </Card>
      </div>

      {barangTerlambat.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} style={{ color: C.rust }} /><h3 className="font-display text-base" style={{ color: C.rust }}>Barang Terlambat Kembali</h3></div>
          <ul className="font-body text-sm flex flex-col gap-1">
            {barangTerlambat.slice(0, 5).map((p) => <li key={p.id} style={{ color: C.inkSoft }}>Peminjaman lewat rencana kembali ({p.rencanaKembali})</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   AGENDA VIEW
--------------------------------------------------------- */
function AgendaView({ agenda, setAgenda, peminjaman, inventaris }) {
  const columns = [
    { key: "tanggal", label: "Tanggal", type: "date", default: todayISO() },
    { key: "waktu", label: "Waktu", type: "time" },
    { key: "judul", label: "Judul" },
    { key: "lokasi", label: "Lokasi" },
    { key: "pj", label: "PJ" },
  ];

  const barangName = (id) => inventaris.find((b) => b.id === id)?.nama || "barang";
  const belumTersinkron = peminjaman.filter(
    (p) => p.rencanaKembali && (p.status === "Menunggu" || p.status === "Dipinjam") && !agenda.some((a) => a.sourceId === p.id)
  );

  function sync() {
    const baru = belumTersinkron.map((p) => ({
      id: uid(), sourceId: p.id, tanggal: p.rencanaKembali, waktu: "",
      judul: `Kembalikan: ${barangName(p.barangId)}`, lokasi: "", pj: p.namaPeminjam || "",
    }));
    setAgenda([...agenda, ...baru]);
  }

  return (
    <div className="flex flex-col gap-4">
      {belumTersinkron.length > 0 && (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-body text-sm" style={{ color: C.inkSoft }}>
              Ada {belumTersinkron.length} rencana pengembalian barang dari Peminjaman yang belum masuk Agenda.
            </p>
            <Btn variant="ochre" icon={ArrowLeftRight} onClick={sync}>Tarik ke Agenda</Btn>
          </div>
        </Card>
      )}
      <CrudSection title="Agenda" subtitle="Jadwal kegiatan Sub Rupa — bisa diisi manual atau ditarik dari Peminjaman, semua bisa diedit ulang" icon={CalendarDays} columns={columns} rows={agenda} onChange={setAgenda} sortKey="tanggal" />
    </div>
  );
}

/* ---------------------------------------------------------
   ABSENSI
--------------------------------------------------------- */
const STATUS_ABSEN = ["Hadir", "Izin", "Sakit", "Alpa"];
const STATUS_TONE = { Hadir: "teal", Izin: "ochre", Sakit: "ochre", Alpa: "rust" };

function AbsensiView({ agenda, absensi, setAbsensi, anggota }) {
  const sortedAgenda = useMemo(() => [...agenda].sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || "")), [agenda]);
  const [agendaId, setAgendaId] = useState(() => sortedAgenda.find((a) => a.tanggal === todayISO())?.id || sortedAgenda[0]?.id || "");

  useEffect(() => {
    if (!agendaId && sortedAgenda.length) setAgendaId(sortedAgenda[0].id);
  }, [sortedAgenda, agendaId]);

  const current = sortedAgenda.find((a) => a.id === agendaId);
  const rows = absensi[agendaId] || {};

  function setStatus(anggotaId, status) {
    setAbsensi({ ...absensi, [agendaId]: { ...rows, [anggotaId]: { ...(rows[anggotaId] || {}), status } } });
  }
  function setKet(anggotaId, keterangan) {
    setAbsensi({ ...absensi, [agendaId]: { ...rows, [anggotaId]: { ...(rows[anggotaId] || {}), keterangan } } });
  }

  const rekap = useMemo(() => {
    const totalKegiatan = agenda.filter((a) => absensi[a.id] && Object.keys(absensi[a.id]).length > 0).length;
    return anggota.map((a) => {
      let hadir = 0, tercatat = 0;
      agenda.forEach((ag) => {
        const st = absensi[ag.id]?.[a.id]?.status;
        if (st) { tercatat++; if (st === "Hadir") hadir++; }
      });
      return { nama: a.nama, hadir, tercatat, totalKegiatan, pct: tercatat ? Math.round((hadir / tercatat) * 100) : null };
    });
  }, [agenda, absensi, anggota]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={20} style={{ color: C.ochre }} />
        <div><h2 className="font-display text-xl" style={{ color: C.ink }}>Absensi</h2>
        <p className="font-body text-xs" style={{ color: C.inkSoft }}>Pengurus/PJ menandai kehadiran anggota per kegiatan</p></div>
      </div>

      {agenda.length === 0 ? <Empty text="Belum ada kegiatan di Agenda. Tambahkan agenda dulu sebelum mengisi absensi." /> : anggota.length === 0 ? <Empty text="Belum ada anggota. Tambahkan anggota dulu di menu Anggota." /> : (
        <>
          <Card>
            <Field label="Pilih kegiatan">
              <Select value={agendaId} onChange={(e) => setAgendaId(e.target.value)}>
                {sortedAgenda.map((a) => <option key={a.id} value={a.id}>{a.tanggal} — {a.judul || "(tanpa judul)"}</option>)}
              </Select>
            </Field>
          </Card>

          {current && (
            <div className="overflow-x-auto rounded-md" style={{ border: `1px solid ${C.line}` }}>
              <table className="w-full text-sm font-body" style={{ background: C.card }}>
                <thead><tr style={{ background: C.paperAlt }}>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: C.inkSoft }}>Anggota</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: C.inkSoft }}>Status</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: C.inkSoft }}>Keterangan</th>
                </tr></thead>
                <tbody>
                  {anggota.map((a) => {
                    const st = rows[a.id]?.status || "";
                    return (
                      <tr key={a.id} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                        <td className="px-3 py-2">{a.nama}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 flex-wrap">
                            {STATUS_ABSEN.map((s) => (
                              <button key={s} onClick={() => setStatus(a.id, s)}
                                className="font-mono text-[11px] px-2 py-1 rounded-full border transition-opacity hover:opacity-75"
                                style={st === s ? { background: STATUS_TONE[s] === "teal" ? C.teal : STATUS_TONE[s] === "rust" ? C.rust : C.ochre, color: "#fff", borderColor: "transparent" } : { background: "transparent", color: C.inkSoft, borderColor: C.line }}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-2 py-2"><Input value={rows[a.id]?.keterangan || ""} onChange={(e) => setKet(a.id, e.target.value)} placeholder="opsional" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <h3 className="font-display text-base mb-2" style={{ color: C.ink }}>Rekap Kehadiran</h3>
            <div className="overflow-x-auto rounded-md" style={{ border: `1px solid ${C.line}` }}>
              <table className="w-full text-sm font-body" style={{ background: C.card }}>
                <thead><tr style={{ background: C.paperAlt }}>
                  {["Anggota","Hadir","Kegiatan Tercatat","Persentase"].map((h) => <th key={h} className="text-left px-3 py-2 font-medium" style={{ color: C.inkSoft }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {rekap.map((r) => (
                    <tr key={r.nama} style={{ borderTop: `1px solid ${C.lineSoft}` }}>
                      <td className="px-3 py-2">{r.nama}</td>
                      <td className="px-3 py-2 font-mono">{r.hadir}</td>
                      <td className="px-3 py-2 font-mono">{r.tercatat}</td>
                      <td className="px-3 py-2">{r.pct === null ? <span style={{ color: C.line }}>—</span> : <Badge tone={r.pct >= 75 ? "teal" : r.pct >= 50 ? "ochre" : "rust"}>{r.pct}%</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   APP SHELL
--------------------------------------------------------- */
const NAV = [
  { key: "dashboard", label: "Beranda", icon: LayoutDashboard },
  { key: "anggota", label: "Anggota", icon: Users },
  { key: "inventaris", label: "Inventaris", icon: Package },
  { key: "peminjaman", label: "Peminjaman", icon: ArrowLeftRight },
  { key: "kas", label: "Kas", icon: Wallet },
  { key: "agenda", label: "Agenda", icon: CalendarDays },
  { key: "absensi", label: "Absensi", icon: ClipboardCheck },
];

function MainApp({ session, onLogout }) {
  const { data, save, loading, error } = useSharedStore();
  const [active, setActive] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-body" style={{ background: C.paper }}>
        <style>{FONTS}</style>
        <div className="flex items-center gap-2" style={{ color: C.inkSoft }}><Loader2 className="animate-spin" size={18} /> Memuat data Sub Rupa…</div>
      </div>
    );
  }

  const anggotaCols = [
    { key: "nama", label: "Nama" }, { key: "nim", label: "NIM" }, { key: "jurusan", label: "Jurusan" },
    { key: "kelas", label: "Kelas" }, { key: "angkatan", label: "Angkatan" }, { key: "kontak", label: "No. HP/WA" },
    { key: "status", label: "Status", type: "select", options: ["Aktif", "Tidak Aktif"], default: "Aktif" },
  ];
  return (
    <div className="min-h-screen font-body flex" style={{ background: C.paper }}>
      <style>{FONTS}</style>

      {/* Sidebar */}
      <aside className={`shrink-0 flex flex-col ${navOpen ? "fixed inset-0 z-40" : "hidden"} md:static md:flex md:w-56`} style={{ background: C.ink }}>
        <div className="p-5 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.inkSoft}` }}>
          <img src={logo} alt="Sub Rupa" className="w-8 h-8 rounded-sm object-cover" />
          <div><p className="font-display text-lg leading-none" style={{ color: C.paper }}>Sub Rupa</p><p className="font-mono text-[10px]" style={{ color: C.inkSoft }}>UKM Kesenian</p></div>
          <button className="ml-auto md:hidden" onClick={() => setNavOpen(false)}><X size={18} color={C.paper} /></button>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {NAV.map((n) => {
            const Icon = n.icon; const isActive = active === n.key;
            return (
              <button key={n.key} onClick={() => { setActive(n.key); setNavOpen(false); }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm text-left transition-colors"
                style={{ background: isActive ? C.ochre : "transparent", color: isActive ? "#fff" : C.paper, opacity: isActive ? 1 : 0.75 }}>
                <Icon size={16} />{n.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto p-4 flex flex-col gap-3">
          <InstallButton />
          <p className="font-mono text-[10px]" style={{ color: C.inkSoft }}>Login: {session.name} ({session.role})</p>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs" style={{ color: C.paper, opacity: 0.75 }}>
            <LogOut size={13} /> Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${C.line}` }}>
          <button onClick={() => setNavOpen(true)}><Menu size={20} color={C.ink} /></button>
          <p className="font-display text-lg" style={{ color: C.ink }}>Sub Rupa</p>
        </header>

        {error && <div className="px-4 py-2 font-body text-xs" style={{ background: C.rustSoft, color: C.rust }}>{error}</div>}

        <main className="flex-1 p-5 md:p-8 max-w-5xl w-full">
          {active === "dashboard" && <DashboardView data={data} goto={setActive} session={session} />}
          {active === "anggota" && <CrudSection title="Anggota" subtitle="Daftar anggota aktif Sub Rupa" icon={Users} columns={anggotaCols} rows={data.anggota} onChange={(v) => save("anggota", v)} sortKey="nama" />}
          {active === "inventaris" && <InventarisView inventaris={data.inventaris} setInventaris={(v) => save("inventaris", v)} peminjaman={data.peminjaman} />}
          {active === "peminjaman" && <PeminjamanView peminjaman={data.peminjaman} setPeminjaman={(v) => save("peminjaman", v)} inventaris={data.inventaris} anggota={data.anggota} />}
          {active === "kas" && <KasView kas={data.kas} setKas={(v) => save("kas", v)} anggota={data.anggota} />}
          {active === "agenda" && <AgendaView agenda={data.agenda} setAgenda={(v) => save("agenda", v)} peminjaman={data.peminjaman} inventaris={data.inventaris} />}
          {active === "absensi" && <AbsensiView agenda={data.agenda} absensi={data.absensi} setAbsensi={(v) => save("absensi", v)} anggota={data.anggota} />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("subrupa-session")); } catch { return null; }
  });

  function handleLogout() {
    localStorage.removeItem("subrupa-session");
    setSession(null);
  }

  if (!session) return <Login onLogin={setSession} />;
  return <MainApp session={session} onLogout={handleLogout} />;
}
