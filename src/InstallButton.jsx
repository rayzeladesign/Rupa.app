import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

const C = {
  ink: "#211C16", inkSoft: "#5B5347", card: "#FFFDF8", ochre: "#B9752B", line: "#DED2B4",
};

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleClick() {
    if (isIOS()) { setShowIOSHelp(true); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowIOSHelp(true); // fallback generic instructions if browser didn't fire the event yet
    }
  }

  return (
    <>
      <button onClick={handleClick}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-sm text-sm font-medium transition-opacity hover:opacity-80"
        style={{ background: "transparent", color: C.ochre, border: `1px solid ${C.ochre}` }}>
        <Download size={15} /> Install App
      </button>

      {showIOSHelp && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: "rgba(33,28,22,0.5)" }}
          onClick={() => setShowIOSHelp(false)}>
          <div className="w-full max-w-sm p-5 rounded-md" style={{ background: C.card, border: `1px solid ${C.line}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold" style={{ color: C.ink }}>Cara Install di iPhone</h3>
              <button onClick={() => setShowIOSHelp(false)}><X size={18} color={C.inkSoft} /></button>
            </div>
            <ol className="text-sm flex flex-col gap-2 list-decimal list-inside" style={{ color: C.inkSoft }}>
              <li>Buka halaman ini pakai <b style={{ color: C.ink }}>Safari</b> (bukan Chrome)</li>
              <li>Ketuk tombol <b style={{ color: C.ink }}>Share</b> (ikon kotak dengan panah ke atas)</li>
              <li>Scroll lalu pilih <b style={{ color: C.ink }}>"Add to Home Screen"</b></li>
              <li>Ketuk <b style={{ color: C.ink }}>"Add"</b> di pojok kanan atas</li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
