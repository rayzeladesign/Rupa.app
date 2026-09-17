import { generateMonthRange } from "./ui.jsx";

/* Kebutuhan / kategori transaksi — bisa ditambah bebas lewat input "Lainnya" */
export const KEBUTUHAN_MASUK = [
  "Iuran/Kas Tambahan", "Dana UKM/Kampus", "Sponsor", "Donasi",
  "Danus (Dana Usaha)", "Penjualan Karya", "Sisa Kegiatan", "Lainnya",
];
export const KEBUTUHAN_KELUAR = [
  "Alat & Bahan", "Konsumsi", "Transportasi", "Cetak & Publikasi",
  "Sewa Tempat/Alat", "Perlengkapan Acara", "Kesekretariatan", "Lainnya",
];

export const monthOf = (iso) => (iso || "").slice(0, 7);

/** Total setoran mingguan semua anggota pada satu bulan */
export function setoranBulan(kas, anggota, key) {
  let total = 0;
  anggota.forEach((a) => {
    const weeks = kas.setoran?.[a.id]?.[key] || {};
    total += Object.values(weeks).reduce((s, v) => s + (Number(v) || 0), 0);
  });
  return total;
}

/**
 * Menggabungkan tiga sumber angka jadi satu rekap per bulan:
 *   1. setoran mingguan anggota (tab Kas)
 *   2. transaksi pemasukan & pengeluaran (modul Transaksi)
 *   3. penyesuaian manual lama di kas.bulanan (masukLain / keluar)
 */
export function buildFinance({ kas, anggota = [], transaksi = [] }) {
  const cfg = kas?.config || { startMonth: "2026-08", endMonth: "2027-04" };
  const base = generateMonthRange(cfg.startMonth, cfg.endMonth);
  const extra = transaksi.map((t) => monthOf(t.tanggal)).filter(Boolean);
  const months = Array.from(new Set([...base, ...extra])).filter(Boolean).sort();

  const perMonth = {};
  months.forEach((k) => (perMonth[k] = { key: k, masukTrans: 0, keluarTrans: 0 }));
  transaksi.forEach((t) => {
    const k = monthOf(t.tanggal);
    if (!perMonth[k]) perMonth[k] = { key: k, masukTrans: 0, keluarTrans: 0 };
    const n = Number(t.nominal) || 0;
    if (t.jenis === "Pengeluaran") perMonth[k].keluarTrans += n;
    else perMonth[k].masukTrans += n;
  });

  let saldoKum = 0;
  const rows = months.map((key) => {
    const b = kas?.bulanan?.[key] || {};
    const masukAnggota = setoranBulan(kas, anggota, key);
    const manualMasuk = Number(b.masukLain || 0);
    const manualKeluar = Number(b.keluar || 0);
    const masukTrans = perMonth[key].masukTrans;
    const keluarTrans = perMonth[key].keluarTrans;
    const masuk = masukAnggota + masukTrans + manualMasuk;
    const keluar = keluarTrans + manualKeluar;
    const saldoBulan = masuk - keluar;
    saldoKum += saldoBulan;
    return {
      key, masukAnggota, masukTrans, keluarTrans, manualMasuk, manualKeluar,
      masuk, keluar, saldoBulan, saldoKum,
      bendahara: b.bendahara || "", keterangan: b.keterangan || "",
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({ masuk: acc.masuk + r.masuk, keluar: acc.keluar + r.keluar }),
    { masuk: 0, keluar: 0 }
  );
  totals.saldo = totals.masuk - totals.keluar;

  const byKebutuhan = (jenis) => {
    const m = {};
    transaksi.filter((t) => (t.jenis || "Pemasukan") === jenis).forEach((t) => {
      const k = t.kebutuhan || "Lainnya";
      m[k] = (m[k] || 0) + (Number(t.nominal) || 0);
    });
    return Object.entries(m).map(([nama, total]) => ({ nama, total })).sort((a, b) => b.total - a.total);
  };

  return { months, rows, totals, keluarPerKebutuhan: byKebutuhan("Pengeluaran"), masukPerKebutuhan: byKebutuhan("Pemasukan") };
}
