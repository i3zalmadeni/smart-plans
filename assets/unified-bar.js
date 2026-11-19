/* شريط المستخدم الموحّد (النسخة نفسها في كل أنظمة النواة الرقمية). */
// الخطط الذكية تسمّي إعدادها SMART_PLANS_CONFIG؛ المكوّن يقرأ رابط القاعدة من APP_CONFIG لصور الحاوية العامة
window.APP_CONFIG = window.APP_CONFIG || { supabaseUrl: (window.SMART_PLANS_CONFIG || {}).supabaseUrl || "" };
// ===== شريط المستخدم الموحّد لمنظومة النواة الرقمية: الإشعارات، ثم صورة المستخدم واسمه الأول والأخير، ثم الخروج =====
// النسخة نفسها في كل الأنظمة. كل نظام يمرّر مصدر إشعاراته ورابط «مشاهدة الكل» إن وُجدت صفحة للإشعارات.
// زر الخروج يحمل المعرّف out، فيعمل معه معالج الخروج الموجود في كل نظام دون تغيير.
const UB_SVG = {
  chart: '<path d="M4 20v-7M10 20V5M16 20v-10M22 20H2"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  apps: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>', building: '<path d="M4 21V7l8-4 8 4v14M9 21v-5h6v5M8 10h.01M12 10h.01M16 10h.01"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>',
  logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/>',
  check: '<path d="M4 12l5 5L20 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', alert: '<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', inbox: '<path d="M3 13l3-8h12l3 8M3 13v6h18v-6M3 13h5l1 3h6l1-3h5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l3 3M14 9l2 2"/>', file: '<path d="M14 3H6v18h12V7zM14 3v4h4"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>', star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1-4.5-4.3 6.1-.8z"/>',
};
const ubIco = (n) => `<svg class="ub-i" viewBox="0 0 24 24" aria-hidden="true">${UB_SVG[n] || UB_SVG.bell}</svg>`;
const ubEsc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// الاسم الأول والأخير: يُبقي الأسماء المركبة («عبد الله»، «آل الشيخ») متصلة
function ubShortName(n) {
  const w = String(n || "").trim().split(/\s+/).filter(Boolean); if (w.length <= 2) return w.join(" ");
  if (w.length === 3 && /^ال/.test(w[1])) return w.join(" "); // اسم حساب وصفي مثل «مدير النواة الرقمية»
  const pre = ["عبد", "أبو", "ابو", "أبا", "ابا"], mid = ["آل", "ال", "أبو", "ابو", "بن", "بنت", "عبد"];
  let first = w[0], i = 1; if (pre.includes(first) && w.length > 2) { first += " " + w[1]; i = 2; }
  let last = w[w.length - 1]; if (w.length - 2 >= i && ["آل", "ال", "أبو", "ابو", "عبد"].includes(w[w.length - 2])) last = w[w.length - 2] + " " + last;
  return mid.includes(last) ? first : first + " " + last;
}
const UB_CSS = `.ub{display:flex;align-items:center;gap:10px;flex:none}
.ub-n{position:relative}
.ub-bell{position:relative;display:grid;place-items:center;width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28);color:#fff;cursor:pointer;padding:0;transition:background .2s}
.ub-lb{text-decoration:none}.ub-lb.on{background:rgba(255,255,255,.3);border-color:#fff}.ub-lbd{position:absolute;top:5px;inset-inline-end:5px;width:8px;height:8px;border-radius:50%;background:#3fd18a;box-shadow:0 0 0 2px rgba(11,52,66,.9)}.ub-lb::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);white-space:nowrap;background:#0b3442;color:#fff;font-size:.78rem;font-weight:700;padding:5px 11px;border-radius:9px;box-shadow:0 6px 18px rgba(8,40,60,.3);opacity:0;pointer-events:none;transition:opacity .15s;z-index:90}.ub-lb:hover::after,.ub-lb:focus-visible::after{opacity:1}.ub-lb:focus-visible{outline:3px solid #f0b34a;outline-offset:2px}@media (prefers-reduced-motion:no-preference){.ub-lbd{animation:ublb 2.4s ease-in-out infinite}@keyframes ublb{50%{box-shadow:0 0 0 2px rgba(11,52,66,.9),0 0 0 6px rgba(63,209,138,.35)}}}@media (max-width:640px){.ub-lb::after{display:none}}.ub-bell:hover,.ub-bell[aria-expanded=true]{background:rgba(255,255,255,.22)}.ub-bell:focus-visible,.ub-out:focus-visible,.ub-u:focus-visible{outline:3px solid #f0b34a;outline-offset:2px}
.ub .ub-i{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.ub-c{position:absolute;inset-block-start:-6px;inset-inline-end:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:99px;background:#f0b34a;color:#3b2a06;font-size:.72rem;font-weight:800;display:grid;place-items:center;box-shadow:0 0 0 2px #17414f;line-height:1}
.ub-c[hidden],.ub-p[hidden],.ub a.ub-all[hidden]{display:none}
.ub-p.ub-sp{width:min(500px,calc(100vw - 24px))}.ub-sg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px;overflow:auto}
.ub a.ub-sys{display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;border:1px solid var(--line,#e2edf1);background:var(--surface,#fff);color:var(--ink,#0d2b45);text-decoration:none;font-weight:400;white-space:normal;min-height:0;transition:border-color .15s,background .15s}
.ub a.ub-sys::after{display:none}.ub a.ub-sys:hover{border-color:#18a4ab;background:var(--soft,#eef8fa);color:var(--ink,#0d2b45)}
.ub a.ub-sys.on{border-color:#18a4ab;background:var(--brandsoft,#e3f6f7)}.ub a.ub-sys:focus-visible{outline:3px solid #f0b34a;outline-offset:2px}
.ub-sys .ub-ic{background:linear-gradient(135deg,#18a4ab,#0c6f82);color:#fff}.ub-sys .ub-tx{min-width:0}
.ub .ub-sys b{display:block;font-size:.86rem;line-height:1.4;color:var(--ink,#0d2b45);white-space:normal}.ub .ub-sys small{display:block;font-size:.74rem;line-height:1.5;color:var(--ink2,#3d566b);max-width:none;white-space:normal;overflow:visible}
.ub a.ub-sys.on small{color:#0c6f82;font-weight:700}
.ub-p{position:absolute;inset-block-start:calc(100% + 10px);inset-inline-end:0;width:min(370px,calc(100vw - 24px));max-height:72vh;display:flex;flex-direction:column;background:var(--surface,#fff);color:var(--ink,#0d2b45);border:1px solid var(--line,#e2edf1);border-radius:18px;box-shadow:0 18px 44px rgba(8,40,60,.28);z-index:80;overflow:hidden;text-align:start;font-weight:400}
.ub-ph{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line,#e2edf1)}
.ub-ph b{font-size:1rem;color:var(--ink,#0d2b45)}.ub-ph button{font:inherit;font-size:.8rem;font-weight:700;color:var(--brand2,#0c6f82);background:none;border:0;cursor:pointer;padding:4px 0}
.ub-l{overflow:auto;flex:1}
.ub a.ub-it{display:flex;align-items:flex-start;gap:10px;padding:11px 14px;text-decoration:none;color:var(--ink,#0d2b45);border-bottom:1px solid var(--soft,#eef8fa);background:none;border-radius:0;font-weight:400;white-space:normal;min-height:0}
.ub a.ub-it::after{display:none}.ub a.ub-it:hover{background:var(--soft,#eef8fa);color:var(--ink,#0d2b45)}.ub a.ub-it.new{background:var(--brandsoft,#e3f6f7)}
.ub-ic{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;flex:none;background:#e7f0fb;color:#2f6fc4}
.ub-ic .ub-i{width:17px;height:17px}.ub-it.ok .ub-ic{background:#e2f5ea;color:#1f9d63}.ub-it.warn .ub-ic{background:#fdf1dc;color:#b06d0c}.ub-it.bad .ub-ic{background:#fbe5e8;color:#c23646}
.ub-it .ub-tx{min-width:0;flex:1}.ub .ub-it small,.ub .ub-it time,.ub .ub-it b{max-width:none;overflow:visible;white-space:normal;text-overflow:clip;display:block}.ub .ub-it b{color:var(--ink,#0d2b45);font-size:.9rem}.ub .ub-it small{color:var(--ink2,#3d566b);font-size:.8rem}.ub .ub-it time{color:var(--muted,#71859a);font-size:.72rem}.ub .ub-ph b{color:var(--ink,#0d2b45)}.ub-it b{display:block;font-size:.9rem;line-height:1.5;color:var(--ink,#0d2b45)}.ub-it small{display:block;color:var(--ink2,#3d566b);font-size:.8rem;line-height:1.6}
.ub-it time{display:block;color:var(--muted,#71859a);font-size:.72rem;margin-top:2px}.ub-it .ub-dot{width:8px;height:8px;border-radius:50%;background:#f0b34a;flex:none;margin-top:8px}
.ub-empty{margin:18px 14px;text-align:center;color:var(--muted,#71859a);font-size:.9rem}
.ub a.ub-all{display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;border-top:1px solid var(--line,#e2edf1);font-weight:800;font-size:.88rem;color:var(--brand2,#0c6f82);text-decoration:none;background:var(--surface,#fff);border-radius:0;white-space:nowrap}
.ub a.ub-all:hover{background:var(--soft,#eef8fa)}
.ub .ub-u{display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#fff;min-height:44px;padding:0;padding-inline-start:10px;border:0;border-radius:0;border-inline-start:1px solid rgba(255,255,255,.18);background:none;font:inherit;font-weight:400;cursor:pointer;box-shadow:none;transform:none}.ub .ub-u:hover{background:none}.ub .ub-u::after{display:none}.ub .ub-u:focus-visible{outline:3px solid #f0b34a;outline-offset:2px}
.ub-cv{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;flex:none;opacity:.8;transition:transform .2s}.ub-u[aria-expanded=true] .ub-cv{transform:rotate(180deg)}
.ub-p.ub-um{width:min(250px,calc(100vw - 24px));padding:6px;gap:2px}
.ub a.ub-mi{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:0;background:none;color:var(--ink,#0d2b45);text-decoration:none;font-weight:700;font-size:.9rem;white-space:normal;min-height:44px}.ub a.ub-mi::after{display:none}.ub a.ub-mi:hover{background:var(--soft,#eef8fa);color:var(--ink,#0d2b45)}.ub a.ub-mi:focus-visible{outline:3px solid #f0b34a;outline-offset:-2px}
.ub a.ub-mi .ub-ic{width:32px;height:32px}.ub-mh{padding:8px 12px 6px;font-size:.78rem;color:var(--muted,#71859a);border-bottom:1px solid var(--line,#e2edf1);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ub-av{width:36px;height:36px;border-radius:50%;flex:none;display:grid;place-items:center;overflow:hidden;background:rgba(255,255,255,.16);color:#fff;font-weight:800;font-size:.95rem;border:2px solid rgba(255,255,255,.6)}
.ub-av img{width:100%;height:100%;object-fit:cover;display:block}
.ub-nm{color:#e3f0f5;font-size:.86rem;font-weight:700;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ub .ub-u:hover .ub-nm{text-decoration:underline}
.ub-out{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28);color:#fff;font:inherit;font-size:.86rem;font-weight:700;cursor:pointer;text-decoration:none;transition:background .2s}
.ub-out .ub-i{width:18px;height:18px}
.ub #out.ub-out,header .ub #out.ub-out{color:#fff;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.28);box-shadow:none;transform:none}
.ub #out.ub-out:hover,header .ub #out.ub-out:hover{background:#c23646;border-color:#c23646;color:#fff}
@media (max-width:700px){.ub-nm,.ub-cv{display:none}.ub .ub-u{padding-inline-start:6px}}
@media (max-width:420px){.ub-sg{grid-template-columns:1fr}}
@media (max-width:520px){.ub{gap:6px}.ub-out span{display:none}.ub-out{padding:0 10px}}
@media (max-width:900px){.ub-p{position:fixed;inset-inline:12px;inset-block-start:auto;margin-top:10px;width:auto;max-width:520px;margin-inline:auto;max-height:70vh}}
.ubg{background:var(--surface,#fff);border:1px solid var(--line,#e2edf1);border-radius:22px;padding:22px;margin:16px 0;color:var(--ink,#0d2b45);box-shadow:0 6px 20px rgba(13,43,69,.06)}
.ubg-h{display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap}.ubg-t{flex:1;min-width:220px}.ubg-t h2{margin:0;font-size:1.3rem;font-weight:800}.ubg-t p{margin:4px 0 0;color:var(--ink2,#3d566b);font-size:.9rem;line-height:1.8}
.ubg-i{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(135deg,#18a4ab,#0c6f82);color:#fff;flex:none}.ubg-i .ub-i{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.ubg .ub-i{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.ubg-mark{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border-radius:13px;border:1px solid var(--line,#e2edf1);background:var(--soft,#eef8fa);color:var(--brand2,#0c6f82);font:inherit;font-weight:700;cursor:pointer}.ubg-mark:hover{background:var(--brandsoft,#e3f6f7)}
.ubg-k{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0 14px}.ubg-kp{border:1px solid var(--line,#e2edf1);border-radius:16px;padding:12px 14px;display:flex;flex-direction:column}.ubg-kp b{font-size:1.6rem;line-height:1.1;font-variant-numeric:tabular-nums}.ubg-kp span{color:var(--ink2,#3d566b);font-size:.84rem}
.ubg-kp.a{background:linear-gradient(135deg,#18a4ab,#0c6f82);border:0;color:#fff}.ubg-kp.a span{color:rgba(255,255,255,.9)}.ubg-kp.n b{color:#b06d0c}.ubg-kp.bad b{color:#c23646}.ubg-kp.warn b{color:#b06d0c}
.ubg-f{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:6px}
.ubg-seg{display:inline-flex;gap:3px;padding:3px;border:1px solid var(--line,#e2edf1);border-radius:12px;background:var(--surface,#fff);flex-wrap:wrap}
.ubg-seg button{border:0;background:none;font:inherit;font-size:.85rem;font-weight:700;color:var(--ink2,#3d566b);padding:7px 12px;border-radius:9px;cursor:pointer;min-height:38px}.ubg-seg button[aria-checked=true]{background:linear-gradient(135deg,#18a4ab,#0c6f82);color:#fff}
.ubg-q{flex:1;min-width:200px;display:flex;align-items:center;gap:8px;border:1px solid var(--line,#e2edf1);border-radius:12px;padding:0 12px;min-height:44px;color:var(--muted,#71859a)}.ubg-q input{flex:1;border:0;outline:0;background:none;font:inherit;color:var(--ink,#0d2b45);min-width:0;box-shadow:none;padding:0}
.ubg-d{margin:18px 0 8px;font-size:.88rem;font-weight:800;color:var(--muted,#71859a)}
.ubg-c{border:1px solid var(--line,#e2edf1);border-radius:16px;overflow:hidden}
.ubg a.ubg-it{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;text-decoration:none;color:var(--ink,#0d2b45);border-bottom:1px solid var(--line,#e2edf1);background:var(--surface,#fff)}.ubg a.ubg-it:last-child{border-bottom:0}
.ubg a.ubg-it:hover{background:var(--soft,#eef8fa)}.ubg a.ubg-it.new{background:var(--brandsoft,#e3f6f7)}
.ubg-it .ub-ic{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;flex:none;background:#e7f0fb;color:#2f6fc4}.ubg-it.ok .ub-ic{background:#e2f5ea;color:#1f9d63}.ubg-it.warn .ub-ic{background:#fdf1dc;color:#b06d0c}.ubg-it.bad .ub-ic{background:#fbe5e8;color:#c23646}
.ubg-it .ub-tx{flex:1;min-width:0}.ubg-it b{display:block;font-size:.98rem;line-height:1.6}.ubg-it small{display:block;color:var(--ink2,#3d566b);font-size:.86rem;line-height:1.7}.ubg-it time{display:block;color:var(--muted,#71859a);font-size:.76rem;margin-top:2px}
.ubg-it .ub-dot{width:9px;height:9px;border-radius:50%;background:#f0b34a;flex:none;margin-top:8px}
.ubg-d span{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:99px;background:var(--soft,#eef8fa);color:var(--ink2,#3d566b);font-size:.75rem;margin-inline-start:4px}
.ubg .ubg-act{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid var(--line,#e2edf1);background:var(--surface,#fff)}.ubg .ubg-act:last-child{border-bottom:0}.ubg .ubg-act.new{background:var(--brandsoft,#e3f6f7)}
.ubg-body{flex:1;min-width:0}.ubg-body .ub-tx b a{color:inherit;text-decoration:none}.ubg-body .ub-tx b a:hover{text-decoration:underline}
.ubg-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.ubg .ubg-acts>a,.ubg .ubg-acts>button{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 14px;border-radius:10px;border:1px solid var(--line,#e2edf1);background:var(--surface,#fff);color:var(--brand2,#0c6f82);font:inherit;font-size:.82rem;font-weight:700;text-decoration:none;cursor:pointer;box-shadow:none;margin:0}
.ubg .ubg-acts>a:hover,.ubg .ubg-acts>button:hover{background:var(--soft,#eef8fa)}
.ubg .ubg-acts>.pri{background:linear-gradient(135deg,#18a4ab,#0c6f82);border-color:transparent;color:#fff}.ubg .ubg-acts>.pri:hover{filter:brightness(1.06);background:linear-gradient(135deg,#18a4ab,#0c6f82)}
.ubg .ubg-acts>.bad{color:#c23646;border-color:#f1c9cf}.ubg .ubg-acts>button:disabled{opacity:.55;cursor:wait}
.ub-tag{display:inline-block;font-style:normal;font-size:.72rem;font-weight:700;color:var(--brand2,#0c6f82);background:var(--soft,#eef8fa);border-radius:7px;padding:1px 8px;margin-bottom:3px}
.ubg-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:40px 16px;text-align:center;color:var(--muted,#71859a)}.ubg-empty .ub-i{width:40px;height:40px;opacity:.5}.ubg-empty b{color:var(--ink,#0d2b45);font-size:1.05rem}
@media (max-width:640px){.ubg{padding:16px;border-radius:18px}.ubg-k{grid-template-columns:repeat(2,minmax(0,1fr))}.ubg-mark{width:100%;justify-content:center}.ubg-seg{width:100%}.ubg-seg button{flex:1}}
@media print{.ub,.ubg-f,.ubg-mark{display:none}}`;
(function () { if (document.getElementById("ub-css")) return; const s = document.createElement("style"); s.id = "ub-css"; s.textContent = UB_CSS; (document.head || document.documentElement).appendChild(s); })();
// أنظمة النواة الرقمية: [المسار على الموقع، الاسم، الأيقونة، الوصف]. كلها على أصل واحد فالدخول مشترك،
// والرابط يفتح «مكتبي الإلكتروني» في لوحة تحكم النظام مباشرة
const UB_SYS = [
  ["digital-core/dashboard.html", "النواة الرقمية", "layers", "الهوية الموحدة والسجلات"],
  ["self-evaluation/admin.html", "التقويم المدرسي الذكي", "check", "المؤشرات والشواهد والتقييم"],
  ["smart-plans/#dashboard", "الخطط الذكية", "cal", "الخطط والبرامج وتوثيقها"],
  ["teachers-community/#/home", "المجتمع المهني الذكي", "users", "النمو المهني والمجتمعات"],
  ["indibati/dashboard.html", "انضباطي", "clock", "الحضور والغياب والتأخر"],
  ["qiyami/dashboard.html", "قيمي", "star", "النقاط والأوسمة والسلوك"],
  ["facility-booking/dashboard.html", "احجز مرفق", "building", "حجز المرافق والقاعات"],
  ["athar/dashboard.html", "أثر", "chart", "قياس الأثر وإدارة الاستبانات"],
  ["report/desk.html", "مرآة | الملف الشامل", "eye", "الملف الشامل للمتعلم والمعلم"],
];
const ubSysHTML = () => { const cur = location.pathname.split("/").filter(Boolean)[0] || "";
  return UB_SYS.map(([p, n, i, d]) => { const on = p.split("/")[0] === cur;
    return `<a class="ub-sys${on ? " on" : ""}" href="/${p}"${on ? ' aria-current="page"' : ""}><span class="ub-ic">${ubIco(i)}</span><span class="ub-tx"><b>${ubEsc(n)}</b><small>${on ? "أنت هنا" : ubEsc(d)}</small></span></a>`; }).join(""); };
// HTML الشريط. home: رابط صفحة المستخدم (ملفه أو حسابه) عند النقر على صورته واسمه
const UB_PROF = "/teachers-community/#/home/profile";
const UB_PW = "/digital-core/password.html";
function ubBarHTML(name, home, pwUrl, profUrl) {
  return `<div class="ub"><div class="ub-n"><button type="button" class="ub-bell ub-swb" id="ubS" aria-label="التنقل بين لوحات تحكم الأنظمة" title="أنظمة النواة الرقمية" aria-expanded="false" aria-haspopup="true" aria-controls="ubSP">${ubIco("apps")}</button>
    <div class="ub-p ub-sp" id="ubSP" role="dialog" aria-label="أنظمة النواة الرقمية" hidden><div class="ub-ph"><b>انتقل إلى لوحة تحكم نظام آخر</b></div><div class="ub-sg">${ubSysHTML()}</div></div></div>
    <a class="ub-bell ub-lb${location.pathname.indexOf("lbeed.html") > -1 ? " on" : ""}" id="ubLb" href="/digital-core/lbeed.html" data-tip="يحدث في لبيد" aria-label="يحدث في لبيد" title="يحدث في لبيد"${location.pathname.indexOf("lbeed.html") > -1 ? ' aria-current="page"' : ""}><svg class="ub-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2.5-6 4 12 2.5-6H21"/></svg><span class="ub-lbd" aria-hidden="true"></span></a>
    <div class="ub-n"><button type="button" class="ub-bell" id="ubB" aria-label="الإشعارات" aria-expanded="false" aria-haspopup="true" aria-controls="ubP">${ubIco("bell")}<span class="ub-c" id="ubC" hidden></span></button>
    <div class="ub-p" id="ubP" role="dialog" aria-label="الإشعارات" hidden><div class="ub-ph"><b>الإشعارات</b><button type="button" id="ubR">تحديد الكل كمقروء</button></div><div class="ub-l" id="ubL"><p class="ub-empty">جارٍ التحميل…</p></div><a class="ub-all" id="ubA" href="#" hidden>مشاهدة الكل</a></div></div>
    <div class="ub-n"><button type="button" class="ub-u" id="ubU" title="${ubEsc(name)}" aria-label="قائمة حسابي" aria-expanded="false" aria-haspopup="true" aria-controls="ubUP"><span class="ub-av" id="ubAv" aria-hidden="true">${ubEsc(String(name || "").trim().charAt(0))}</span><span class="ub-nm">${ubEsc(ubShortName(name))}</span><svg class="ub-cv" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
    <div class="ub-p ub-um" id="ubUP" role="menu" aria-label="حسابي" hidden><div class="ub-mh" id="ubUN">${ubEsc(name)}</div>
      <a class="ub-mi" role="menuitem" id="ubMpw" href="${ubEsc(pwUrl || UB_PW)}"><span class="ub-ic">${ubIco("lock")}</span><span>تغيير كلمة المرور</span></a>
      <a class="ub-mi" role="menuitem" id="ubMpf" href="${ubEsc(profUrl || UB_PROF)}"><span class="ub-ic">${ubIco("user")}</span><span>تعديل الملف المهني</span></a></div></div>
    <button type="button" class="ub-out" id="out">${ubIco("logout")}<span>خروج</span></button></div>`;
}
// تشغيل الشريط بعد إدراجه (يجوز استدعاؤه بعد كل إعادة رسم للشريط). o: { key, uid, load: async () => [عناصر], allUrl, markAll: async () => {} }
// العنصر: { id, title, body, href, icon, tone: ok|warn|bad|info, t: وقت (اختياري), read: (اختياري؛ وإلا يُحفظ المقروء في هذا المتصفح),
//   tag: وسم قصير (اختياري), group: عنوان تجميع للعناصر بلا وقت في الصفحة (اختياري),
//   acts: أزرار إجراء HTML يبنيها النظام نفسه (اختياري، تظهر في الصفحة فقط) }
const UB = { o: null, N: [], at: 0, seen: new Set(), photo: undefined, pages: [] };
const ubKey = () => "ub-seen-" + ((UB.o && UB.o.key) || "x") + "-" + ((UB.o && UB.o.uid) || "");
const ubSave = () => { try { localStorage.setItem(ubKey(), JSON.stringify([...UB.seen].slice(-400))); } catch (_) {} };
const ubUnread = (x) => (x.read != null ? !x.read : !UB.seen.has(String(x.id)));
const ubFmt = (t) => { const d = new Date(t); return isNaN(d) ? "" : d.toLocaleString("ar-SA-u-ca-gregory-nu-latn", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }); };
const ubTx = (x, link) => `<span class="ub-tx">${x.tag ? `<em class="ub-tag">${ubEsc(x.tag)}</em>` : ""}<b>${link && x.href ? `<a href="${ubEsc(x.href)}">${ubEsc(x.title)}</a>` : ubEsc(x.title)}</b>${x.body ? `<small>${ubEsc(x.body)}</small>` : ""}${x.t ? `<time>${ubEsc(ubFmt(x.t))}</time>` : ""}</span>`;
const ubDot = (x) => (ubUnread(x) ? '<span class="ub-dot" aria-label="غير مقروء"></span>' : "");
// عنصر بإجراءات (في الصفحة) يُرسم كتلة لا رابطاً، كي لا تتداخل الأزرار مع الرابط
const ubItem = (x, i, cls, page) => (page && x.acts)
  ? `<div class="${cls} ubg-act ${ubEsc(x.tone || "info")}${ubUnread(x) ? " new" : ""}" data-ubi="${i}"><span class="ub-ic">${ubIco(x.icon || "bell")}</span><div class="ubg-body">${ubTx(x, true)}<div class="ubg-acts">${x.acts}</div></div>${ubDot(x)}</div>`
  : `<a class="${cls} ${ubEsc(x.tone || "info")}${ubUnread(x) ? " new" : ""}" href="${ubEsc(x.href || "#")}" data-ubi="${i}"><span class="ub-ic">${ubIco(x.icon || "bell")}</span>${ubTx(x)}${ubDot(x)}</a>`;
function ubPaint() {
  const $u = (s) => document.getElementById(s), C = $u("ubC"), B = $u("ubB"), L = $u("ubL");
  const n = UB.N.filter(ubUnread).length;
  if (C) { C.hidden = !n; C.textContent = n > 9 ? "9+" : String(n); }
  if (B) B.setAttribute("aria-label", n ? `الإشعارات، ${n} غير مقروء` : "الإشعارات");
  if (L) L.innerHTML = UB.N.length ? UB.N.slice(0, 12).map((x, i) => ubItem(x, i, "ub-it")).join("") : '<p class="ub-empty">لا إشعارات حالياً.</p>';
  UB.pages.forEach((f) => f());
}
async function ubLoad() {
  if (!UB.o) return; try { UB.N = (await UB.o.load()) || []; } catch (e) { console.error(e); UB.N = []; }
  const tv = (x) => +new Date(x.t || 0) || 0;
  UB.N.sort((a, b) => (ubUnread(b) - ubUnread(a)) || (tv(b) - tv(a))); UB.at = Date.now(); UB.loaded = true; ubPaint();
}
async function ubMarkAll() { UB.N.forEach((x) => UB.seen.add(String(x.id))); ubSave(); if (UB.o && UB.o.markAll) { try { await UB.o.markAll(); } catch (_) {} } UB.N = UB.N.map((x) => (x.read != null ? { ...x, read: true } : x)); ubPaint(); }
const ubClose = () => { [["ubP", "ubB"], ["ubSP", "ubS"], ["ubUP", "ubU"]].forEach(([p, b]) => { const P = document.getElementById(p), B = document.getElementById(b); if (P) P.hidden = true; if (B) B.setAttribute("aria-expanded", "false"); }); };
function ubMount(o) {
  const $u = (s) => document.getElementById(s), B = $u("ubB"), P = $u("ubP"), A = $u("ubA");
  const first = !UB.o || UB.o.key !== o.key || UB.o.uid !== o.uid;
  UB.o = o; if (first) { try { UB.seen = new Set(JSON.parse(localStorage.getItem(ubKey()) || "[]")); } catch (_) { UB.seen = new Set(); } }
  if (!B) return;
  // الصورة: من سجل النواة (دالة core_my_photo)، وإلا يبقى أول حرف من الاسم. تُجلب مرة واحدة
  const cli = o.client || (typeof sb !== "undefined" ? sb : null);
  const put = (url) => { if (!url) return; const im = new Image(); im.alt = ""; im.onload = () => { const d = $u("ubAv"); if (d && !d.querySelector("img")) { d.textContent = ""; d.appendChild(im); } }; im.src = url; };
  if (UB.photo !== undefined) put(UB.photo);
  else if (cli) { UB.photo = null; Promise.resolve(cli.rpc("core_my_photo")).then(async (r) => {
    const ph = r && r.data; if (!ph || !ph.path) return; let url = null;
    if (ph.public) url = `${APP_CONFIG.supabaseUrl}/storage/v1/object/public/${ph.bucket}/${ph.path.split("/").map(encodeURIComponent).join("/")}`;
    else { try { const s = await cli.storage.from(ph.bucket).createSignedUrl(ph.path, 3600); url = s && s.data && s.data.signedUrl; } catch (_) {} }
    UB.photo = url; put(url);
  }).catch(() => {}); }
  if (A && o.allUrl) { A.href = o.allUrl; A.hidden = false; }
  const SW = $u("ubS"), SP = $u("ubSP");
  if (SW && SP) { SW.onclick = (e) => { e.stopPropagation(); const open = SP.hidden; ubClose(); SP.hidden = !open; SW.setAttribute("aria-expanded", String(open)); };
    SP.onclick = (e) => e.stopPropagation(); }
  const UU = $u("ubU"), UP = $u("ubUP");
  if (UU && UP) { UU.onclick = (e) => { e.stopPropagation(); const open = UP.hidden; ubClose(); UP.hidden = !open; UU.setAttribute("aria-expanded", String(open)); };
    UP.onclick = (e) => { e.stopPropagation(); if (e.target.closest("a")) ubClose(); }; }
  B.onclick = (e) => { e.stopPropagation(); const open = P.hidden; if (open) ubClose(); P.hidden = !open; B.setAttribute("aria-expanded", String(open)); if (open && Date.now() - UB.at > 60000) ubLoad(); };
  $u("ubR").onclick = (e) => { e.stopPropagation(); ubMarkAll(); };
  P.onclick = (e) => { e.stopPropagation(); const a = e.target.closest("[data-ubi]"); if (a) { const x = UB.N[+a.dataset.ubi]; if (x) { UB.seen.add(String(x.id)); ubSave(); } ubClose(); } else if (e.target.closest("#ubA")) ubClose(); };
  if (!window.__ubDoc) { window.__ubDoc = true;
    document.addEventListener("click", ubClose);
    document.addEventListener("keydown", (e) => { if (e.key !== "Escape") return; const op = [["ubP", "ubB"], ["ubSP", "ubS"], ["ubUP", "ubU"]].find(([p]) => { const x = document.getElementById(p); return x && !x.hidden; });
      if (op) { ubClose(); const b = document.getElementById(op[1]); if (b) b.focus(); } }); }
  if (first || !UB.loaded) ubLoad(); else ubPaint();
}
// ===== صفحة الإشعارات الموحّدة التصميم (المصدر نفسه والمقروء نفسه في الجرس) =====
const UB_TONE = { all: "الكل", bad: "عاجل", warn: "يحتاج متابعة", info: "للعلم", ok: "منجز" };
function ubPage(host, sys) {
  if (!host) return; let F = "all", T = "all", Q = "";
  host.innerHTML = `<section class="ubg"><div class="ubg-h"><span class="ubg-i" aria-hidden="true">${ubIco("bell")}</span><div class="ubg-t"><h2>الإشعارات</h2><p>كل ما يخصك في ${ubEsc(sys || "هذا النظام")}: ما ينتظر إجراءك، ونتائج طلباتك، والمستجدات. المقروء هنا مقروء في الجرس أيضاً.</p></div>
    <button type="button" class="ubg-mark" id="ubgR">${ubIco("check")}<span>تحديد الكل كمقروء</span></button></div>
    <div class="ubg-k" id="ubgK"></div>
    <div class="ubg-f"><div class="ubg-seg" role="radiogroup" aria-label="عرض">${[["all", "الكل"], ["new", "غير المقروء"]].map(([k, n]) => `<button type="button" role="radio" data-ubf="${k}">${n}</button>`).join("")}</div>
      <div class="ubg-seg" role="radiogroup" aria-label="النوع">${Object.entries(UB_TONE).map(([k, n]) => `<button type="button" role="radio" data-ubt="${k}">${n}</button>`).join("")}</div>
      <label class="ubg-q">${ubIco("search")}<input type="search" id="ubgQ" placeholder="بحث في الإشعارات" aria-label="بحث في الإشعارات"></label></div>
    <div class="ubg-l" id="ubgL" aria-live="polite"><p class="ub-empty">جارٍ التحميل…</p></div></section>`;
  const day = (x) => { const t = x.t; if (!t) return x.group || "يحتاج إجراءً الآن"; const d = new Date(t), k = (x) => x.toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" }), now = new Date();
    if (isNaN(d)) return "أخرى"; const dd = k(d), td = k(now), yd = k(new Date(now - 864e5)); if (dd > td) return "قادم"; if (dd === td) return "اليوم"; if (dd === yd) return "أمس";
    return now - d < 7 * 864e5 ? "هذا الأسبوع" : "أقدم"; };
  const draw = () => {
    const L = document.getElementById("ubgL"); if (!L) { UB.pages = UB.pages.filter((f) => f !== draw); return; }
    const all = UB.N, un = all.filter(ubUnread).length, cnt = (t) => all.filter((x) => (x.tone || "info") === t).length;
    document.getElementById("ubgK").innerHTML = [["الكل", all.length, "a"], ["غير مقروء", un, "n"], ["عاجل", cnt("bad"), "bad"], ["يحتاج متابعة", cnt("warn"), "warn"]].map(([n, v, c]) => `<div class="ubg-kp ${c}"><b>${v}</b><span>${n}</span></div>`).join("");
    host.querySelectorAll("[data-ubf]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.ubf === F)));
    host.querySelectorAll("[data-ubt]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.ubt === T)));
    if (!UB.loaded) return;
    const q = Q.trim(), list = all.map((x, i) => [x, i]).filter(([x]) => (F === "all" || ubUnread(x)) && (T === "all" || (x.tone || "info") === T) && (!q || (x.title + " " + (x.body || "")).includes(q)));
    if (!list.length) { L.innerHTML = `<div class="ubg-empty">${ubIco("bell")}<b>${all.length ? "لا إشعارات مطابقة" : "لا إشعارات حالياً"}</b><span>${all.length ? "غيّر التصفية لعرض غيرها." : "ستظهر هنا مستجدات النظام وما ينتظر إجراءك."}</span></div>`; return; }
    const G = new Map(); list.forEach((p) => { const g = day(p[0]); if (!G.has(g)) G.set(g, []); G.get(g).push(p); });
    L.innerHTML = [...G].map(([g, ps]) => `<h3 class="ubg-d">${ubEsc(g)} <span>${ps.length}</span></h3><div class="ubg-c">${ps.map(([x, i]) => ubItem(x, i, "ubg-it", true)).join("")}</div>`).join("");
  };
  UB.pages = UB.pages.filter((f) => document.body.contains(host) && f !== draw); UB.pages.push(draw);
  host.addEventListener("click", (e) => {
    const f = e.target.closest("[data-ubf]"), t = e.target.closest("[data-ubt]"), a = e.target.closest("[data-ubi]");
    if (f) { F = f.dataset.ubf; draw(); } else if (t) { T = t.dataset.ubt; draw(); }
    else if (a) { const x = UB.N[+a.dataset.ubi]; if (x) { UB.seen.add(String(x.id)); ubSave(); ubPaint(); } }
    else if (e.target.closest("#ubgR")) ubMarkAll();
  });
  host.querySelector("#ubgQ").addEventListener("input", (e) => { Q = e.target.value; draw(); });
  draw(); if (!UB.loaded || Date.now() - UB.at > 30000) ubLoad();
}
// تحديث الاسم بعد الدخول (للأنظمة التي تبني الشريط قبل معرفة المستخدم)
function ubSetName(name, home, pwUrl, profUrl) {
  const u = document.getElementById("ubU") || document.querySelector(".ub-u"); if (!u) return; u.title = name || "";
  const pw = document.getElementById("ubMpw"); if (pw && pwUrl) pw.href = pwUrl;
  const pf = document.getElementById("ubMpf"); if (pf && profUrl) pf.href = profUrl;
  const nn = document.getElementById("ubUN"); if (nn) nn.textContent = name || "";
  const n = u.querySelector(".ub-nm"); if (n) n.textContent = ubShortName(name);
  const av = document.getElementById("ubAv"); if (av && !av.querySelector("img")) av.textContent = String(name || "").trim().charAt(0);
}
// ===== نهاية شريط المستخدم الموحّد =====
// ===== زر إغلاق (×) في أعلى كل نافذة منبثقة (.modal) مع بقاء الإغلاق السفلي =====
// يعيد استخدام زر الإغلاق الموجود في النافذة ([data-x]) فتنفَّذ دالة الإغلاق نفسها، وإلا ينقر على الخلفية
(function () {
  if (window.__mxInit) return; window.__mxInit = true;
  const st = document.createElement("style");
  st.textContent = `.modal:not(.lb)>div{position:relative}.modal:not(.lb)>div>.mx{position:absolute;top:12px;inset-inline-end:12px;width:38px;height:38px;min-height:0;display:grid;place-items:center;padding:0;margin:0;border-radius:50%;border:1px solid var(--line,#e2edf1);background:var(--surface,#fff);color:var(--ink2,#3d566b);cursor:pointer;box-shadow:none;transform:none;z-index:3;transition:background .15s}.modal:not(.lb)>div>.mx svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.modal:not(.lb)>div>.mx:hover{background:var(--soft,#eef8fa)}.modal:not(.lb)>div>.mx:focus-visible{outline:3px solid #f0b34a;outline-offset:2px}.modal:not(.lb)>div>.mx+*{padding-inline-end:46px}`;
  (document.head || document.documentElement).appendChild(st);
  const add = (m) => {
    if (!m.classList || !m.classList.contains("modal") || m.classList.contains("lb")) return;
    const d = m.firstElementChild; if (!d || d.querySelector(":scope>.mx")) return;
    const f = d.firstElementChild; if (f && (f.hasAttribute("data-x") || f.querySelector("[data-x]"))) return; // في الأعلى زر إغلاق أصلاً
    const b = document.createElement("button"); b.type = "button"; b.className = "mx"; b.setAttribute("aria-label", "إغلاق");
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    b.onclick = (e) => { e.stopPropagation(); const c = d.querySelector("[data-x]"); if (c) c.click(); else m.dispatchEvent(new MouseEvent("click", { bubbles: true })); if (m.isConnected) m.remove(); };
    d.prepend(b);
  };
  new MutationObserver((rs) => rs.forEach((r) => r.addedNodes.forEach((n) => { if (n.nodeType === 1) { add(n); if (n.querySelectorAll) n.querySelectorAll(".modal").forEach(add); } }))).observe(document.documentElement, { childList: true, subtree: true });
  document.querySelectorAll(".modal").forEach(add);
})();
