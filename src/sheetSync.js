// Ganti dengan URL hasil "Deploy > New deployment > Web app" di Apps Script.
// Contoh: https://script.google.com/macros/s/AKfycb..../exec
const SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxaYc0W7-YA0BAmG1p7NrIItp2jmOBXIgzxCLt298lnli-fJ1-lMyKZZmLtx8adV3qA/exec";


/**
 * Kirim perubahan transaksi ke Google Sheets sebagai salinan.
 * Dipanggil "fire-and-forget" — kalau gagal (offline, quota, dsb),
 * app tetap jalan normal karena sumber data asli tetap Firestore.
 *
 * action: "add" | "edit" | "delete"
 * item:   objek transaksi { id, tanggal, jenis, kebutuhan, nominal, keterangan, bukti }
 */
export function syncToSheet(action, item) {
  if (!SHEET_WEBHOOK_URL || SHEET_WEBHOOK_URL.includes("PASTE_URL_DEPLOYMENT")) {
    return; // belum di-setup — dilewati diam-diam, tidak mengganggu app
  }
  try {
    fetch(SHEET_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors", // Apps Script tidak mendukung preflight CORS biasa
      headers: { "Content-Type": "text/plain" }, // wajib text/plain biar lolos tanpa preflight
      body: JSON.stringify({ action, item }),
    }).catch((err) => console.warn("Sync ke Sheets gagal (diabaikan):", err));
  } catch (err) {
    console.warn("Sync ke Sheets gagal (diabaikan):", err);
  }
}

/**
 * Kirim SEMUA data sekaligus ke Sheets, menimpa tab Transaksi/Anggota/Kas Bulanan
 * dari nol dan menyiapkan tab Dashboard dengan rumus otomatis.
 * Dipakai untuk sinkronisasi awal (backfill data lama) atau "refresh total".
 */
export function bulkSyncToSheet({ transaksi, anggota, kasRows, danaDarurat }) {
  if (!SHEET_WEBHOOK_URL || SHEET_WEBHOOK_URL.includes("PASTE_URL_DEPLOYMENT")) {
    return Promise.reject(new Error("URL Apps Script belum di-setup di sheetSync.js"));
  }
  return fetch(SHEET_WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "bulk_sync", transaksi, anggota, kasRows, danaDarurat }),
  });
}
