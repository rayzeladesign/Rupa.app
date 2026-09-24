// Ganti dengan URL hasil "Deploy > New deployment > Web app" di Apps Script.
// Contoh: https://script.google.com/macros/s/AKfycb..../exec
const SHEET_WEBHOOK_URL = "PASTE_URL_DEPLOYMENT_DI_SINI";

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
