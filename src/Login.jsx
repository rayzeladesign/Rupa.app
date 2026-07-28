import React, { useState } from "react";
import { PaintBucket, LogIn } from "lucide-react";
import { USERS } from "./users.js";
import InstallButton from "./InstallButton.jsx";

const C = {
  ink: "#211C16", inkSoft: "#5B5347", paper: "#F6F1E7",
  card: "#FFFDF8", ochre: "#B9752B", line: "#DED2B4", rust: "#A8452B", rustSoft: "#F1D9CD",
};

export default function Login({ onLogin }) {
  const [selected, setSelected] = useState(USERS[0].name);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    const user = USERS.find((u) => u.name === selected);
    if (user && user.pin === pin) {
      const session = { name: user.name, role: user.role };
      localStorage.setItem("subrupa-session", JSON.stringify(session));
      onLogin(session);
    } else {
      setErr("PIN salah. Coba lagi.");
      setPin("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-sans px-4" style={{ background: C.paper }}>
      <form onSubmit={submit} className="w-full max-w-sm p-6 rounded-md" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2 mb-6">
          <PaintBucket size={22} style={{ color: C.ochre }} />
          <div>
            <p className="text-lg font-semibold leading-none" style={{ color: C.ink }}>Sub Rupa</p>
            <p className="text-[11px]" style={{ color: C.inkSoft }}>UKM Kesenian — Masuk</p>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs mb-3" style={{ color: C.inkSoft }}>
          Masuk sebagai
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="px-3 py-2 rounded-sm text-sm outline-none" style={{ background: C.paper, border: `1px solid ${C.line}`, color: C.ink }}>
            {USERS.map((u) => <option key={u.name} value={u.name}>{u.name} — {u.role}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs mb-4" style={{ color: C.inkSoft }}>
          PIN
          <input type="password" inputMode="numeric" maxLength={8} value={pin}
            onChange={(e) => setPin(e.target.value)} placeholder="••••"
            className="px-3 py-2 rounded-sm text-sm outline-none tracking-widest" style={{ background: C.paper, border: `1px solid ${C.line}`, color: C.ink }} autoFocus />
        </label>

        {err && <p className="text-xs mb-3 px-2 py-1.5 rounded-sm" style={{ background: C.rustSoft, color: C.rust }}>{err}</p>}

        <button type="submit" className="w-full flex items-center justify-center gap-2 py-2 rounded-sm text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: C.ochre }}>
          <LogIn size={15} /> Masuk
        </button>

        <div className="mt-3"><InstallButton /></div>
      </form>
    </div>
  );
}
