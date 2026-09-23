/*  सीधा मतलब — static site builder
 *  data/posts.json  ->  dist/  (index, per-post pages, sitemap, robots)
 *  Koi dependency nahi. Chalane ke liye:  node build.js
 */

const fs = require("fs");
const path = require("path");

const SITE = {
  url: "https://seedhamatlab.com",
  name: "सीधा मतलब",
  nameEn: "Seedha Matlab",
  tagline: "WhatsApp पर आए संदिग्ध message, link और offer का verified सच—और तुरंत क्या करना है।",
  eyebrow: "सूचना डेस्क · भारत",
  instagram: "", // Instagram handle abhi nahi hai — link yahan daalein tabhi footer me dikhega
  x: "https://x.com/seedhamatlab",
  whatsapp: "https://whatsapp.com/channel/0029Vb9DXQb3gvWW4lRkkq3r",
  email: "seedhamatlab@gmail.com",
  // Cloudflare Web Analytics "automatic setup" se chalu hai — Cloudflare khud beacon
  // lagata hai. ISE KHAALI HI RAHNE DIJIYE, warna gintee do baar hogi.
  cfAnalytics: "",
};

const CATS = {
  scam: { name: "साइबर स्कैम", v: "--c-scam" },
  bank: { name: "बैंकिंग / RBI", v: "--c-bank" },
  consumer: { name: "उपभोक्ता अधिकार", v: "--c-consumer" },
  insurance: { name: "बीमा / IRDAI", v: "--c-insurance" },
  epfo: { name: "EPFO / सैलरी", v: "--c-epfo" },
};
const SEV = { alert: "अलर्ट", right: "आपका अधिकार", info: "जानकारी" };
// Small, article-specific decision cards. These are typographic illustrations, not evidence.
const CARDS = {
  "digital-arrest": { label: "SCAM ALERT", icon: "✦", headline: "Video call पर arrest?", points: ["Call काटें", "पैसे या OTP न दें", "1930 पर report करें"] },
  "golden-hour-3-din": { label: "QUICK ACTION", icon: "↗", headline: "पैसे कटे? अभी ये करें", points: ["Bank को तुरंत बताएं", "Complaint number रखें", "Cyber fraud: 1930"] },
  "free-look-30-din": { label: "KNOW YOUR RIGHT", icon: "✓", headline: "Life policy: 30-day free look", points: ["1 साल+ की policy", "Document मिलने से गिनें", "Company को लिखित request"] },
  "epf-e-nomination": { label: "FAMILY CHECK", icon: "◎", headline: "EPF nominee check करें", points: ["Official member portal", "Details verify करें", "e-nomination पूरा करें"] },
  "consumer-1915": { label: "CONSUMER HELP", icon: "→", headline: "Product में problem?", points: ["Seller से लिखित बात", "Proof संभालकर रखें", "NCH: 1915"] },
  "fake-customer-care": { label: "NUMBER CHECK", icon: "☎", headline: "Search वाला helpline?", points: ["Ad number पर भरोसा नहीं", "Official site से number", "Screen share कभी नहीं"] },
  "electricity-kyc-apk": { label: "LINK ALERT", icon: "⚡", headline: "बिजली KYC का APK?", points: ["APK install न करें", "Bill official route से check", "Suspicious message report"] },
  "upi-pin-refund": { label: "UPI SAFETY", icon: "₹", headline: "Refund लेने को PIN?", points: ["Receive ≠ PIN", "QR scan से payment", "App में amount देखें"] },
  "boss-whatsapp-payment": { label: "VERIFY FIRST", icon: "↗", headline: "Boss ने payment कहा?", points: ["अलग से call करें", "Attachment न चलाएं", "Linked devices check"] },
  "task-job-scam": { label: "JOB SCAM", icon: "✦", headline: "Task के लिए पैसे?", points: ["Job offer verify", "Top-up न करें", "Chat proof रखें"] },
  "trai-sim-threat": { label: "CALL ALERT", icon: "☎", headline: "TRAI SIM बंद करेगा?", points: ["Call काटें", "Operator से check", "Chakshu report"] },
  "fake-echallan": { label: "LINK CHECK", icon: "→", headline: "E-challan SMS आया?", points: ["Link पर न जाएं", "Official portal खोलें", "Payment से पहले verify"] },
  "report-suspect": { label: "REPORT GUIDE", icon: "✓", headline: "सिर्फ suspect message?", points: ["URL / number note", "I4C Report Suspect", "पैसा गया तो 1930"] },
  "screen-share-containment": { label: "ACT NOW", icon: "!", headline: "Screen access दे दी?", points: ["Session बंद करें", "Bank को बताएं", "Access हटाकर जांचें"] },
  "sim-connections-check": { label: "SELF CHECK", icon: "◎", headline: "आपके नाम पर कितनी SIM?", points: ["Sanchar Saathi खोलें", "Connections देखें", "Unknown number report"] },
};
const MONTHS = ["जन", "फ़र", "मार्च", "अप्रैल", "मई", "जून", "जुल", "अग", "सित", "अक्तू", "नव", "दिस"];

/* ---------------------------------------------------------------- utils */

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const plain = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();

function fmtDateLine(iso) {
  const p = String(iso || "").split("-");
  if (p.length !== 3) return "";
  return `${p[2]} ${MONTHS[parseInt(p[1], 10) - 1] || ""} ${p[0]}`;
}
function fmtDateStack(iso) {
  const p = String(iso || "").split("-");
  if (p.length !== 3) return "";
  return `${p[2]} ${MONTHS[parseInt(p[1], 10) - 1] || ""}<br>${p[0]}`;
}

function inline(s) {
  let out = esc(s);
  out = out.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g,
    (_match, label, href) => `<a href="${href}"${href.startsWith('/') ? '' : ' target="_blank" rel="noopener"'}>${label}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return out;
}

function renderBody(text) {
  const lines = String(text || "").split("\n");
  let html = "", list = null, para = [];
  const flushPara = () => { if (para.length) { html += `<p>${inline(para.join(" "))}</p>`; para = []; } };
  const flushList = () => { if (list) { html += `<ul>${list}</ul>`; list = null; } };
  for (const raw of lines) {
    const ln = raw.trim();
    if (!ln) { flushPara(); flushList(); continue; }
    if (ln.startsWith("## ")) { flushPara(); flushList(); html += `<h2>${esc(ln.slice(3))}</h2>`; }
    else if (ln.startsWith("- ")) { flushPara(); list = (list || "") + `<li>${inline(ln.slice(2))}</li>`; }
    else { flushList(); para.push(ln); }
  }
  flushPara(); flushList();
  return html;
}

/* WhatsApp par bhejne ka link — shirshak + pata, dono encoded */
const waShare = (title, url) =>
  `https://wa.me/?text=${encodeURIComponent(`${plain(title)}\n\n${url}`)}`;

const catName = (c) => (CATS[c] ? CATS[c].name : c);
const catColor = (c) => (CATS[c] ? `var(${CATS[c].v})` : "var(--ink-3)");

/* ---------------------------------------------------------------- styles */

const CSS = `
:root{
  --paper:#EDEFE9;--surface:#FBFBF7;--ink:#15202B;--ink-2:#4B5762;--ink-3:#77828B;
  --line:#D4D8CE;--line-soft:#E2E5DC;--stamp:#A62D1F;--verify:#0E5E57;
  --c-scam:#A62D1F;--c-bank:#1F4FA6;--c-consumer:#8A5514;--c-insurance:#5B3E8C;--c-epfo:#0E5E57;
  --shadow:0 1px 0 rgba(21,32,43,.05);
  --serif:"Tiro Devanagari Hindi",Georgia,"Noto Serif Devanagari",serif;
  --sans:"Mukta","Noto Sans Devanagari",system-ui,-apple-system,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  color-scheme:light;
}
/* Warm light canvas; category colours make scanning the page easier. */
*{box-sizing:border-box}
[hidden]{display:none!important}
html{-webkit-text-size-adjust:100%}
body{background:linear-gradient(150deg,#fff8e8 0,#edf8f7 48%,#f5f1fc 100%) fixed;color:var(--ink);font-family:var(--sans);font-size:16.5px;line-height:1.72;margin:0}
.wrap{max-width:920px;margin:0 auto;padding-inline:18px;padding-block:0 48px}
a{color:inherit}
button{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--verify);outline-offset:2px;border-radius:2px}
.skip{position:absolute;left:-9999px}
.skip:focus{left:18px;top:8px;background:var(--surface);border:1px solid var(--line);padding:6px 10px;border-radius:3px;z-index:10}

.masthead{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-block:26px 14px}
.header-actions{display:flex;align-items:center;gap:10px}
.contact-top{font-size:13px;color:#195eae;font-weight:700;text-decoration:none}
.menu-toggle{border:1px solid #bacbdc;background:#fff;border-radius:10px;padding:7px 11px;cursor:pointer;color:#195eae;font-size:19px;line-height:1.1}
.menu-toggle span{font-size:12px;vertical-align:middle;margin-left:3px}
.site-menu{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;background:#edf6ff;border:1px solid #c9ddeb;border-radius:12px;padding:12px;margin:0 0 14px}
.site-menu a{display:block;background:#fff;border-radius:8px;padding:9px 12px;text-decoration:none;color:#174a82;font-weight:600}
.site-menu a:hover,.site-menu a:focus-visible{background:#dcecff}
.brand-en{display:block;color:#195eae;font:700 12px var(--sans);letter-spacing:.06em;margin-top:3px}
.landing{padding:22px 0 26px}
.landing-label{color:#0e5e57;font-size:12px;letter-spacing:.1em;font-weight:700}
.landing h2{font-size:clamp(23px,5vw,38px);line-height:1.32;margin:5px 0 14px;max-width:24ch}
.landing-links{display:flex;flex-wrap:wrap;gap:9px;margin:15px 0 0}
.landing-links a{background:#195eae;color:white;border-radius:9px;padding:9px 14px;text-decoration:none;font-weight:600;font-size:14px}
.landing-links a:nth-child(2){background:#e4f3f2;color:#0e5e57}
.quickpaths{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:15px 0 20px}
.quickpaths a{display:block;padding:16px;border:1px solid #c8d9e7;background:#fff;border-radius:12px;text-decoration:none;color:#174a82;line-height:1.5}
.quickpaths strong{display:block;font-size:16px}
.quickpaths span{display:block;color:var(--ink-2);font-size:13px;margin-top:5px}
.quickpaths a:hover{border-color:#195eae;background:#eff7ff}
.quickpaths a:nth-child(2){border-color:#e7c5be;background:#fff8f4}
.quickpaths a:nth-child(2) strong{color:#983e2c}
@media(max-width:610px){.quickpaths{grid-template-columns:1fr}.quickpaths a{padding:12px 15px}}
.answerbox{margin:18px 0;padding:17px 20px;border-left:4px solid #195eae;background:#eef6ff;border-radius:0 12px 12px 0}
.answerbox h2{margin:0 0 5px;font-size:16px;color:#174a82}
.answerbox p{margin:0 0 9px;font-size:15px;line-height:1.55}
.answerbox ul{margin:0;padding-left:20px;font-size:15px}
.answerbox li{margin-bottom:3px}
.copy-status{font-size:13px;color:#0e5e57;align-self:center}
.articles-title{font-size:24px;line-height:1.35;margin:20px 0 5px}
@media(max-width:550px){.masthead{align-items:center}.contact-top{display:none}.stamp{display:none}.wordmark{font-size:29px}.mark{width:44px;height:44px}}
.brand{display:flex;align-items:center;gap:13px;text-decoration:none;color:inherit}
.mark{flex:none;width:48px;height:48px;border-radius:50%;display:block}
.hero{margin:6px 0 4px;border:1px solid var(--line);border-radius:5px;overflow:hidden;background:#1767bf}
.hero img{display:block;width:100%;height:auto}
.promise{display:block;padding:26px 24px;margin:8px 0 6px;border:1px solid #b5ded9;border-radius:16px;background:linear-gradient(115deg,#d9f5ed,#eef9e4 62%,#fff1d8);box-shadow:0 12px 34px rgba(14,94,87,.08);font-family:var(--sans);font-weight:700;font-size:clamp(20px,4.4vw,30px);line-height:1.48;text-decoration:none}
.promise:before{content:"SEEDHA MATLAB  /  VERIFIED HELP";display:block;color:#0e5e57;font:700 11px var(--sans);letter-spacing:.13em;margin-bottom:12px}
.promise .promise-more{display:block;margin-top:14px;font-size:14px;font-weight:600;color:#0e5e57}
.promise:hover{border-color:#0e5e57}
.visual{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;min-height:170px;padding:17px 18px;border-radius:13px;background:linear-gradient(135deg,#185ab6 0%,#247ace 67%,#2d9ec5 100%);color:#fff;isolation:isolate}
.visual:after{content:"";position:absolute;right:-45px;top:-55px;width:190px;height:190px;border-radius:50%;border:24px solid rgba(255,255,255,.09);z-index:-1}
.visual[data-cat="bank"]{background:linear-gradient(135deg,#2150b6,#5789e4)}
.visual[data-cat="insurance"]{background:linear-gradient(135deg,#365cbd,#827bd8)}
.visual[data-cat="consumer"]{background:linear-gradient(135deg,#205fae,#468cce)}
.visual[data-cat="epfo"]{background:linear-gradient(135deg,#1d67ad,#3297b4)}
.visual .v-top{display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:700;letter-spacing:.13em}
.visual .v-icon{display:grid;place-items:center;width:32px;height:32px;border:1px solid rgba(255,255,255,.55);border-radius:50%;font-size:20px;line-height:1}
.visual strong{display:block;font-size:clamp(17px,3vw,26px);line-height:1.3;max-width:30ch}
.visual ul{display:flex;gap:6px;flex-wrap:wrap;padding:0;margin:9px 0 0;list-style:none}
.visual li{padding:4px 8px;border-radius:6px;background:rgba(255,255,255,.16);font-size:12px;line-height:1.4}
.visual small{display:block;margin-top:9px;opacity:.83;font-size:10px}
.entry .visual{min-height:150px;margin-bottom:13px}
.entry:not(.pinned){grid-template-columns:54px minmax(0,1fr)}
.entry:not(.pinned) .visual{grid-column:1/-1}
.visual-feature{margin:20px 0 22px;min-height:230px;padding:22px 24px}
.visual-feature strong{font-size:clamp(23px,4vw,33px)}
.visual-feature li{font-size:14px}
.asklink{display:flex;align-items:center;gap:9px;margin:16px 0 0;padding:13px 15px;border:1px solid var(--line);border-left:3px solid var(--accent,#2ec4b6);border-radius:4px;background:var(--surface);text-decoration:none;color:var(--ink);font-size:14.5px;line-height:1.55}
.asklink b{font-weight:600}
.qa{margin-top:10px}
.qa details{border-bottom:1px solid var(--line-soft);padding:13px 0}
.qa summary{cursor:pointer;font-size:16px;font-weight:600;line-height:1.5;list-style:none}
.qa summary::-webkit-details-marker{display:none}
.qa summary::before{content:"स ";font-family:var(--mono);font-size:11px;color:var(--ink-3);margin-right:7px}
.qa details[open] summary{color:var(--stamp)}
.qa .ans{padding-top:9px;font-size:15px;color:var(--ink-2);line-height:1.72}
.verline{font-family:var(--mono);font-size:11.5px;color:var(--ink-3);margin-top:14px;padding-top:10px;border-top:1px solid var(--line-soft);line-height:1.7}
.brand{text-decoration:none;display:block}
.eyebrow{display:block;font-family:var(--mono);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);margin-bottom:2px}
.wordmark{font-family:var(--serif);font-size:clamp(30px,8.5vw,42px);line-height:1.08;letter-spacing:-.01em;margin:0;font-weight:400}
.stamp{flex:none;transform:rotate(-7deg);border:1.5px solid var(--stamp);color:var(--stamp);border-radius:3px;padding:5px 9px 4px;text-align:center;font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;line-height:1.5;opacity:.9;margin-top:6px}
.stamp b{display:block;font-size:11px;letter-spacing:.06em;font-weight:500}
.rule{border:0;border-top:2px solid var(--ink);margin:0}
.rule-thin{border:0;border-top:1px solid var(--line);margin:3px 0 0}
.kicker{font-family:var(--mono);font-size:11px;color:var(--ink-2);padding-block:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:baseline}
.kicker .dot{color:var(--ink-3)}

.controls{display:flex;flex-direction:column;gap:10px;padding-block:6px 16px}
.search{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:3px;padding:8px 11px}
.search svg{flex:none;opacity:.55}
.search input{border:0;background:transparent;color:var(--ink);font:inherit;font-size:15px;width:100%;outline:none;padding:0}
.cats{display:flex;gap:7px;overflow-x:auto;padding-bottom:3px;scrollbar-width:none}
.cats::-webkit-scrollbar{display:none}
.chip{flex:none;background:transparent;border:1px solid var(--line);border-radius:999px;padding:4px 12px 5px;font-size:13.5px;cursor:pointer;color:var(--ink-2);white-space:nowrap;transition:background .15s,border-color .15s,color .15s}
.chip:hover{border-color:var(--ink-3)}
.chip[aria-pressed="true"]{background:#195eae;border-color:#195eae;color:#fff}

.listhead{font-family:var(--mono);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);padding-block:14px 6px;border-top:1px solid var(--line)}
.entry{display:grid;grid-template-columns:54px 1fr;gap:0 14px;padding:18px;background:var(--surface);border:1px solid var(--line-soft);border-radius:16px;text-decoration:none;margin:0 0 14px;box-shadow:0 8px 22px rgba(21,32,43,.045)}
.entry:first-of-type{border-top:0}
.meta{font-family:var(--mono);font-size:11px;color:var(--ink-3);padding-top:6px;line-height:1.5}
.meta .cdot{display:block;width:7px;height:7px;border-radius:50%;margin-bottom:6px;background:var(--ink-3)}
.entry h2{font-family:var(--serif);font-weight:400;font-size:20px;line-height:1.36;margin:0 0 4px;text-wrap:balance}
.entry:hover h2{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.entry p{margin:0;color:var(--ink-2);font-size:14.5px;line-height:1.62}
.catname{font-family:var(--mono);font-size:10px;letter-spacing:.09em;text-transform:uppercase}
.entry.pinned{grid-template-columns:1fr;border:1px solid #e7bcb4;border-radius:16px;padding:18px;margin-bottom:16px}
.alertlabel{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--stamp);margin-bottom:5px;display:block}
.empty{padding:34px 0;color:var(--ink-3);font-size:15px;border-top:1px solid var(--line-soft)}

.back{display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-family:var(--mono);font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-2);padding:14px 0}
.back:hover{color:var(--ink)}
article header{border-top:1px solid var(--line);padding-top:20px}
.postmeta{font-family:var(--mono);font-size:11px;letter-spacing:.07em;color:var(--ink-3);display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
article h1{font-family:var(--serif);font-weight:400;font-size:clamp(25px,6.4vw,33px);line-height:1.3;margin:0 0 12px;text-wrap:balance}
.standfirst{font-size:17px;line-height:1.66;color:var(--ink-2);margin:0 0 4px}
.prose{max-width:72ch}
@media(min-width:700px){.listings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.listings .entry{margin:0}.listings .entry.pinned{grid-column:1/-1}.listings .entry.pinned .visual{min-height:210px}}
.prose h2{font-family:var(--sans);font-weight:600;font-size:13px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);margin:30px 0 6px}
.prose p{margin:0 0 14px}
.prose ul{margin:0 0 16px;padding-left:19px}
.prose li{margin-bottom:7px}
.prose strong{font-weight:600}
.prose a{color:var(--verify);text-underline-offset:3px}
.sources{border-left:3px solid var(--verify);background:var(--surface);padding:14px 16px;margin:26px 0 14px;border-radius:0 3px 3px 0}
.sources h3{font-family:var(--mono);font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--verify);margin:0 0 8px;font-weight:500}
.sources a{display:block;font-size:14px;color:var(--ink);margin-bottom:5px;text-underline-offset:3px}
.sources a:last-child{margin-bottom:0}
.tagrow{display:flex;gap:6px;flex-wrap:wrap;margin:18px 0 0}
.tag{font-family:var(--mono);font-size:10.5px;color:var(--ink-3);border:1px solid var(--line);border-radius:2px;padding:2px 7px}
.postfoot{display:flex;gap:9px;flex-wrap:wrap;margin-top:22px;padding-top:16px;border-top:1px solid var(--line-soft)}
.btn{background:var(--surface);border:1px solid var(--line);border-radius:3px;padding:7px 13px;font-size:13.5px;cursor:pointer;color:var(--ink);text-decoration:none;display:inline-block}
.btn:hover{border-color:var(--ink-3)}
.more{margin-top:34px;border-top:1px solid var(--line);padding-top:6px}

footer{margin-top:44px;border-top:2px solid var(--ink);padding-top:20px}
.fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:22px}
footer h4{font-family:var(--mono);font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);margin:0 0 7px;font-weight:500}
footer p{margin:0;font-size:14px;color:var(--ink-2);line-height:1.62}
.links{display:flex;flex-direction:column;gap:5px}
.links a{font-size:14px;color:var(--ink);text-decoration:none;display:flex;gap:8px;align-items:baseline}
.links a:hover{text-decoration:underline;text-underline-offset:3px}
.links .handle{font-family:var(--mono);font-size:12px;color:var(--ink-3)}
.fine{margin-top:24px;padding-top:14px;border-top:1px solid var(--line-soft);font-size:12.5px;color:var(--ink-3)}
.copyright{display:flex;align-items:center;gap:9px;margin-top:17px;color:var(--ink-2);font-size:12px}
.copyright img{border-radius:50%;width:27px;height:27px}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

/* ---------------------------------------------------------------- chrome */

function head({ title, desc, canonical, type = "website", published, home = false, ogImage = `${SITE.url}/og.png` }) {
  const t = esc(title);
  const d = esc(plain(desc));
  return `<!doctype html>
<html lang="hi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="hi_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(ogImage)}">
${published ? `<meta property="article:published_time" content="${esc(published)}">` : ""}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/logo.jpg">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi&family=Mukta:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">मुख्य सामग्री पर जाएँ</a>
<div class="wrap">
<header class="masthead">
  <a class="brand" href="/">
    <img class="mark" src="/logo.jpg" alt="" width="48" height="48">
    <span>
      <span class="eyebrow">${esc(SITE.eyebrow)}</span>
      ${home ? `<h1 class="wordmark">${esc(SITE.name)}</h1>` : `<p class="wordmark">${esc(SITE.name)}</p>`}
      <span class="brand-en">SEEDHA MATLAB</span>
    </span>
  </a>
  <div class="header-actions"><a class="contact-top" href="mailto:${esc(SITE.email)}">Contact</a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Menu खोलें">☰ <span>Menu</span></button></div>
</header>
<nav id="site-menu" class="site-menu" aria-label="मुख्य menu" hidden>
  <a href="/">Home</a><a href="/#articles">Scam Alerts / Articles</a><a href="/how-to-check/">अभी क्या करें</a><a href="/faq/">FAQ</a><a href="/about/">About</a><a href="/#contact">Contact</a>
</nav>
<hr class="rule">
<hr class="rule-thin">
<div class="kicker">
  <span>संदिग्ध मैसेज · लिंक · कॉल · ऑफ़र</span>
  <span class="dot">—</span>
  <span>हर बात का स्रोत नीचे दर्ज</span>
</div>
`;
}

function foot() {
  const wa = SITE.whatsapp
    ? `<a href="${esc(SITE.whatsapp)}" target="_blank" rel="noopener">WhatsApp Channel <span class="handle">जाँचे हुए अलर्ट</span></a>`
    : "";
  const ig = SITE.instagram
    ? `<a href="${esc(SITE.instagram)}" target="_blank" rel="noopener">Instagram <span class="handle">@seedhamatlab</span></a>`
    : "";
  return `
<footer id="contact">
  <div class="fgrid">
    <div>
      <h4>यह डेस्क क्या है</h4>
      <p>नियम और चेतावनियाँ सीधी भाषा में — बिना डर बेचे, बिना वायरल किए। हर पोस्ट के नीचे सरकारी स्रोत का लिंक रहता है ताकि आप खुद जाँच सकें।</p>
    </div>
    <div>
      <h4>कहाँ मिलेंगे</h4>
      <div class="links">
        <a href="mailto:${esc(SITE.email)}">Contact <span class="handle">${esc(SITE.email)}</span></a>
        ${ig}
        ${wa}
        <a href="${esc(SITE.x)}" target="_blank" rel="noopener">X <span class="handle">@seedhamatlab</span></a>
      </div>
    </div>
    <div>
      <h4>इस डेस्क के बारे में</h4>
      <div class="links">
        <a href="/faq/">सवाल-जवाब</a>
        <a href="/about/">हमारे बारे में</a>
        <a href="/source-policy/">स्रोत नीति</a>
        <a href="/feed.xml">RSS फ़ीड <span class="handle">बिना ऐप के जुड़िए</span></a>
      </div>
    </div>
    <div>
      <h4>ज़रूरी नंबर</h4>
      <div class="links">
        <a href="https://cybercrime.gov.in" target="_blank" rel="noopener">साइबर फ्रॉड <span class="handle">1930</span></a>
        <a href="https://consumerhelpline.gov.in" target="_blank" rel="noopener">उपभोक्ता हेल्पलाइन <span class="handle">1915</span></a>
        <a href="https://cms.rbi.org.in" target="_blank" rel="noopener">RBI शिकायत <span class="handle">CMS पोर्टल</span></a>
      </div>
    </div>
  </div>
  <p class="fine">यह सामान्य जानकारी है, कानूनी या वित्तीय सलाह नहीं। अपने मामले में आधिकारिक स्रोत या पेशेवर से पुष्टि करें।</p>
  <div class="copyright"><img src="/logo.jpg" alt="Seedha Matlab logo" width="27" height="27"><span>© ${new Date().getFullYear()} Seedha Matlab · स्वतंत्र जन-जागरूकता सामग्री</span></div>
</footer>
</div>
<script>(function(){var b=document.querySelector('.menu-toggle'),m=document.getElementById('site-menu');b.addEventListener('click',function(){var open=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!open));b.setAttribute('aria-label',open?'Menu खोलें':'Menu बंद करें');m.hidden=open;});})();</script>
${SITE.cfAnalytics ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${esc(SITE.cfAnalytics)}"}'></script>` : ""}
</body>
</html>`;
}

/* ---------------------------------------------------------------- pages */

function infoVisual(p, feature = false) {
  const c = CARDS[p.id];
  if (!c) return "";
  return `<div class="visual${feature ? " visual-feature" : ""}" data-cat="${esc(p.cat)}" role="img" aria-label="${esc(`${c.headline}: ${c.points.join(', ')}`)}">
    <div class="v-top"><span>${esc(c.label)}</span><span class="v-icon" aria-hidden="true">${esc(c.icon)}</span></div>
    <div><strong>${esc(c.headline)}</strong><ul>${c.points.map((point) => `<li>${esc(point)}</li>`).join("")}</ul></div>
    <small>Seedha Matlab · ${esc((p.sources || [])[0]?.label.split(" — ")[0] || "Official source")} · checked ${esc(p.verified || p.date)}</small>
  </div>`;
}

function entryHTML(p) {
  const hay = esc([p.title, p.summary, p.body, (p.tags || []).join(" "), catName(p.cat)].join(" ").toLowerCase());
  const href = `/p/${encodeURIComponent(p.id)}/`;
  if (p.pinned) {
    return `<a class="entry pinned" href="${href}" data-cat="${esc(p.cat)}" data-text="${hay}">
  ${infoVisual(p)}
  <div>
    <span class="alertlabel">ताज़ा ${esc(SEV[p.severity] || "जानकारी")} · ${fmtDateLine(p.date)}</span>
    <h2>${esc(p.title)}</h2>
    <p>${esc(p.summary)}</p>
  </div>
</a>`;
  }
  return `<a class="entry" href="${href}" data-cat="${esc(p.cat)}" data-text="${hay}">
  ${infoVisual(p)}
  <div class="meta"><i class="cdot" style="background:${catColor(p.cat)}"></i>${fmtDateStack(p.date)}</div>
  <div>
    <div class="catname" style="color:${catColor(p.cat)}">${esc(catName(p.cat))}</div>
    <h2>${esc(p.title)}</h2>
    <p>${esc(p.summary)}</p>
  </div>
</a>`;
}

const LIST_JS = `
(function(){
  var q=document.getElementById('q'), entries=[].slice.call(document.querySelectorAll('.entry'));
  var chips=[].slice.call(document.querySelectorAll('.chip')), empty=document.getElementById('empty');
  var head=document.getElementById('listhead'), cat='all';
  function apply(){
    var term=(q.value||'').trim().toLowerCase(), shown=0;
    entries.forEach(function(el){
      var ok=(cat==='all'||el.getAttribute('data-cat')===cat) &&
             (!term||el.getAttribute('data-text').indexOf(term)!==-1);
      el.hidden=!ok; if(ok) shown++;
    });
    empty.hidden=shown>0;
    head.textContent=(term||cat!=='all')?('खोज परिणाम — '+shown):'ताज़ा पोस्ट';
  }
  q.addEventListener('input',apply);
  chips.forEach(function(b){
    b.addEventListener('click',function(){
      cat=b.getAttribute('data-cat');
      chips.forEach(function(o){o.setAttribute('aria-pressed',String(o===b));});
      apply();
    });
  });
})();
`;

function renderIndex(posts) {
  const chips =
    `<button class="chip" data-cat="all" aria-pressed="true">सब</button>` +
    Object.keys(CATS).map((k) => `<button class="chip" data-cat="${k}" aria-pressed="false">${esc(CATS[k].name)}</button>`).join("");

  const ld = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: SITE.nameEn,
    url: SITE.url,
    description: plain(SITE.tagline),
    inLanguage: "hi-IN",
  };

  return head({
    title: `${SITE.name} — ${SITE.nameEn}`,
    desc: SITE.tagline,
    canonical: SITE.url + "/",
    home: true,
  }) + `
<main id="main">
  <section class="landing" aria-label="Seedha Matlab introduction">
    <span class="landing-label">VERIFIED HELP · सीधी बात</span>
    <h2>संदिग्ध message आया? पहले जाँचें, फिर action लें।</h2>
    <p>Scam alert, official source और अगला सही कदम—एक जगह, आसान Hindi + English में।</p>
    <div class="landing-links"><a href="/how-to-check/">Message कैसे verify करें →</a><a href="#articles">Latest articles देखें ↓</a></div>
  </section>
  <nav class="quickpaths" aria-label="कहाँ से शुरू करें">
    <a href="/how-to-check/"><strong>संदिग्ध message मिला?</strong><span>Link, call या offer को check करने का तरीका</span></a>
    <a href="/p/golden-hour-3-din/"><strong>पैसा कट गया?</strong><span>Bank और cyber fraud reporting के अगले कदम</span></a>
    <a href="#articles"><strong>Articles देखें</strong><span>Search और category से अपना सवाल चुनें</span></a>
  </nav>
  <a class="promise" href="/how-to-check/">${esc(SITE.tagline)}<span class="promise-more">कैसे verify करें? Step-by-step guide खोलें →</span></a>
  <a class="asklink" href="/faq/"><b>कोई सवाल है?</b> — सबसे ज़्यादा पूछे जाने वाले सवालों के जवाब यहाँ देखिए →</a>
  <h2 class="articles-title" id="articles">Latest articles / नए लेख</h2>
  <div class="controls">
    <div class="search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <label for="q" class="skip">खोजें</label>
      <input id="q" type="search" placeholder="खोजें — जैसे OTP, फर्ज़ी लिंक, कॉल" autocomplete="off">
    </div>
    <div class="cats">${chips}</div>
  </div>
  <div class="listhead" id="listhead">ताज़ा पोस्ट</div>
  <div class="listings">${posts.map(entryHTML).join("\n")}</div>
  <div class="empty" id="empty" hidden>इस खोज में कुछ नहीं मिला। कोई और शब्द आज़माइए या श्रेणी बदलिए।</div>
</main>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script>${LIST_JS}</script>` + foot();
}

function renderPost(p, all) {
  const url = `${SITE.url}/p/${encodeURIComponent(p.id)}/`;
  const points = CARDS[p.id]?.points || [];
  const sources = (p.sources || []).map(
    (s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`
  ).join("");
  const tags = (p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  const related = all.filter((o) => o.id !== p.id && o.cat === p.cat).slice(0, 3);
  const others = (related.length ? related : all.filter((o) => o.id !== p.id).slice(0, 3));

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: plain(p.title),
    description: plain(p.summary),
    datePublished: p.date,
    inLanguage: "hi-IN",
    articleSection: catName(p.cat),
    mainEntityOfPage: url,
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    author: { "@type": "Organization", name: SITE.name },
  };

  return head({
    title: `${plain(p.title)} — ${SITE.name}`,
    desc: p.summary,
    canonical: url,
    type: "article",
    published: p.date,
    ogImage: `${SITE.url}/post-og/${encodeURIComponent(p.id)}.png`,
  }) + `
<main id="main">
  <a class="back" href="/">← सारे पोस्ट</a>
  <article>
    <header>
      <div class="postmeta">
        <span style="color:${catColor(p.cat)}">${esc(catName(p.cat))}</span><span>·</span>
        <span>${fmtDateLine(p.date)}</span><span>·</span>
        <span>${esc(SEV[p.severity] || "जानकारी")}</span>
      </div>
      <h1>${esc(p.title)}</h1>
    </header>
    <section class="answerbox" aria-label="सीधा जवाब और अभी क्या करें">
      <h2>सीधा जवाब</h2><p>${esc(p.summary)}</p>
      ${points.length ? `<h2>अभी क्या करें</h2><ul>${points.slice(0,3).map(point=>`<li>${esc(point)}</li>`).join("")}</ul>` : ""}
    </section>
    ${infoVisual(p, true)}
    <div class="prose">${renderBody(p.body)}</div>
    ${sources ? `<div class="sources"><h3>स्रोत — खुद जाँचिए</h3>${sources}</div>` : ""}
    <p class="verline">स्रोत: ${esc((p.sources || []).map((s) => s.label).join(" · ") || "—")}<br>
    प्रकाशित: ${fmtDateLine(p.date)}${p.verified && p.verified !== p.date ? ` · आख़िरी जाँच: ${fmtDateLine(p.verified)}` : ""}<br>
    नियम बाद में बदल सकते हैं — ऊपर दिया स्रोत खोलकर ताज़ा स्थिति देख लीजिए।</p>
    ${tags ? `<div class="tagrow">${tags}</div>` : ""}
    <div class="postfoot">
      <a class="btn" href="${esc(waShare(p.title, url))}" target="_blank" rel="noopener">WhatsApp पर भेजें</a>
      <button class="btn copy-link" type="button" data-url="${esc(url)}">Link copy करें</button><span class="copy-status" role="status" aria-live="polite"></span>
      <a class="btn" href="mailto:${esc(SITE.email)}?subject=${encodeURIComponent(`Seedha Matlab correction: ${p.title}`)}">सुधार बताएं</a>
      <a class="btn" href="/">और पोस्ट पढ़ें</a>
    </div>
  </article>
  ${others.length ? `<div class="more"><div class="listhead">इसे भी पढ़ें</div>${others.map(entryHTML).join("\n")}</div>` : ""}
</main>
<script>(function(){var b=document.querySelector('.copy-link'),s=document.querySelector('.copy-status');if(!b)return;b.addEventListener('click',async function(){try{await navigator.clipboard.writeText(b.getAttribute('data-url'));s.textContent='Link copy हो गया';}catch(e){s.textContent='Copy नहीं हुआ—browser का Share विकल्प इस्तेमाल करें';}});})();</script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>` + foot();
}

function renderPage({ slug, title, desc, body }) {
  return head({
    title: `${title} — ${SITE.name}`,
    desc,
    canonical: `${SITE.url}/${slug}/`,
  }) + `
<main id="main">
  <a class="back" href="/">← सारे पोस्ट</a>
  <article>
    <header>
      <h1>${esc(title)}</h1>
      <p class="standfirst">${esc(desc)}</p>
    </header>
    <div class="prose">${renderBody(body)}</div>
    <div class="postfoot"><a class="btn" href="/">सारे पोस्ट देखें</a></div>
  </article>
</main>` + foot();
}

const ABOUT = {
  slug: "about",
  title: "हमारे बारे में",
  desc: "WhatsApp पर आए संदिग्ध message, link और offer का verified सच—और तुरंत क्या करना है।",
  body: `## यह डेस्क क्या करता है

अभी हमारा मुख्य काम है संदिग्ध WhatsApp/SMS संदेश, लिंक, कॉल और ऑफ़र की जाँच आसान बनाना। हर लेख में साफ़ verdict, तुरंत करने वाला कदम और आधिकारिक स्रोत मिलेगा।

पुराने लेखों में बैंकिंग अधिकार, उपभोक्ता, बीमा और EPFO से जुड़ी जानकारी भी है। इस शुरुआती दौर में हमारा नया content मुख्यतः scam alert और धोखाधड़ी के बाद तुरंत उठाए जाने वाले कदमों पर होगा।

**साइबर स्कैम** — संदिग्ध बात की पहचान, स्रोत से जाँच और अगला सुरक्षित कदम।

## यह डेस्क क्या नहीं करता

- **डर नहीं बेचता।** घबराहट फैलाकर क्लिक बटोरना आसान है, पर उससे किसी का बचाव नहीं होता।
- **सलाहकार नहीं है।** यहाँ जो है वह सामान्य जानकारी है — कानूनी या वित्तीय सलाह नहीं। अपने मामले में आधिकारिक स्रोत या पेशेवर से पुष्टि कीजिए।
- **कुछ बेचता नहीं।** कोई विज्ञापन नहीं, कोई प्रायोजित पोस्ट नहीं, किसी बैंक या बीमा कंपनी का कोई रेफरल लिंक नहीं।

## नाम क्यों नहीं

यह डेस्क बिना नाम के चलता है, और यह जान-बूझकर है। मक़सद यह है कि आप बात को उसके **स्रोत** से परखें, लिखने वाले के नाम या पद से नहीं। इसीलिए हर पोस्ट के नीचे सरकारी लिंक रहता है — ताकि आप हम पर भरोसा किए बिना भी खुद जाँच सकें।

यहाँ किसी संस्था की अंदरूनी जानकारी नहीं आती। जो कुछ लिखा जाता है, वह सार्वजनिक रूप से उपलब्ध आधिकारिक दस्तावेज़ों से आता है। पूरा तरीका [स्रोत नीति](/source-policy/) में दर्ज है।

## कुछ कहना हो

कोई तथ्य गलत लगे तो X पर @seedhamatlab को सार्वजनिक reply में बताइए। निजी जानकारी साझा न करें। सुधार की नीति भी स्रोत नीति वाले पन्ने पर लिखी है।`,
};

const SOURCE_POLICY = {
  slug: "source-policy",
  title: "स्रोत नीति",
  desc: "हर पोस्ट के नीचे आधिकारिक स्रोत का लिंक क्यों रहता है, कौन से स्रोत इस्तेमाल होते हैं, और गलती होने पर क्या किया जाता है।",
  body: `## बुनियादी नियम

**हर पोस्ट के नीचे कम से कम एक आधिकारिक स्रोत का लिंक रहेगा।** अगर किसी बात का स्रोत नहीं मिलता, तो वह बात यहाँ नहीं लिखी जाती — चाहे वह कितनी भी सही लगती हो।

यही इस डेस्क की पूरी बात है। आपको हम पर भरोसा करने की ज़रूरत नहीं — लिंक खोलिए और खुद देख लीजिए।

## कौन से स्रोत

पहली पसंद हमेशा मूल दस्तावेज़ होता है — सर्कुलर, अधिसूचना, मास्टर डायरेक्शन, या विभाग का अपना पोर्टल:

- **RBI** — बैंकिंग नियम, ग्राहक संरक्षण, शिकायत व्यवस्था
- **IRDAI** — बीमा से जुड़े नियम
- **EPFO** — PF, पेंशन, नामांकन
- **I4C / cybercrime.gov.in** — साइबर अपराध और हेल्पलाइन 1930
- **राष्ट्रीय उपभोक्ता हेल्पलाइन (1915) और e-Jagriti** — उपभोक्ता शिकायत और आयोग में दाखिला
- संसद, मंत्रालय और न्यायालय के दस्तावेज़, जहाँ लागू हों

समाचार रिपोर्ट को स्रोत नहीं माना जाता। अगर कोई खबर किसी नियम की बात करती है, तो हम उस नियम का मूल दस्तावेज़ ढूँढते हैं और उसी को लिंक करते हैं।

## क्या यहाँ कभी नहीं आएगा

- किसी बैंक, कंपनी या संस्था की **अंदरूनी या गोपनीय जानकारी**
- किसी **व्यक्ति या ग्राहक** से जुड़ी कोई जानकारी
- अफ़वाह, "सुना है", या फ़ॉरवर्ड मैसेज — बिना मूल दस्तावेज़ के
- कोई विज्ञापन, प्रायोजित सामग्री या रेफरल लिंक

## नियम बदलते रहते हैं

हर पोस्ट पर तारीख़ दर्ज है। नियम उसके बाद बदल सकता है — इसलिए अपने मामले में हमेशा स्रोत वाला लिंक खोलकर ताज़ा स्थिति देख लीजिए। यहाँ जो है वह सामान्य जानकारी है, कानूनी या वित्तीय सलाह नहीं।

## गलती हो जाए तो

गलती हो सकती है। अगर कोई तथ्य गलत मिले, तो:

- सुधार **उसी पोस्ट में** किया जाएगा, चुपचाप हटाया नहीं जाएगा
- अगर बात का मतलब ही बदल जाता हो, तो पोस्ट में साफ़ लिखा जाएगा कि क्या सुधरा
- बताने के लिए X पर @seedhamatlab को सार्वजनिक reply दें; निजी जानकारी साझा न करें

भरोसा इसी से बनता है कि गलती मानी जाए, छुपाई न जाए।`,
};

const HOW_TO_CHECK = {
  slug: "how-to-check",
  title: "संदिग्ध message या link मिला? ऐसे check करें",
  desc: "किस पर भरोसा करें, कौन-सा link न खोलें और fraud होने पर कहाँ report करें—एक सरल decision guide।",
  body: `## 1. रुकें और पहचानें

Message में account बंद होने का डर, refund का लालच, तुरंत payment की माँग या APK install करने को कहा गया है? Link खोलकर सत्यापन शुरू न करें। Number, logo या पुरानी chat अपने आप प्रमाण नहीं हैं। उदाहरण: [बिजली KYC APK](/p/electricity-kyc-apk/) और [boss का payment message](/p/boss-whatsapp-payment/)।

## 2. दूसरे रास्ते से verify करें

जिस संस्था का नाम लिया गया है, उसकी **official website या app** खुद खोलें। Customer-care number वहीं से लें; search में ऊपर दिखा ad प्रमाण नहीं है। व्यक्ति के नाम से payment instruction आया हो तो पहले से ज्ञात number पर **अलग call** करके पुष्टि करें। [Fake customer care की guide](/p/fake-customer-care/)।

## 3. अपने अगले कदम का रास्ता चुनें

- **सिर्फ संदिग्ध call/message:** Sanchar Saathi के [Chakshu](https://sancharsaathi.gov.in/sfc/) या I4C के [Report Suspect](https://cybercrime.gov.in/Webform/cyber_suspect.aspx) में उपयुक्त जानकारी report करें। [इन रास्तों का फर्क](/p/report-suspect/)।
- **पैसा कट गया या cybercrime हुआ:** अपने bank को official helpline/app से तुरंत बताएं; [1930 या cybercrime.gov.in](https://cybercrime.gov.in) पर शिकायत करें। कोई recovery की guarantee नहीं है।
- **Screen-sharing access दी थी:** Sharing बंद करें, permissions हटाएँ और bank से account की सुरक्षा जाँच कराएँ। [तुरंत करने वाले कदम](/p/screen-share-containment/)।

## और जानें

[UPI refund में PIN का नियम](/p/upi-pin-refund/) · [अक्सर पूछे सवाल](/faq/) · [हमारी source policy](/source-policy/)।

स्रोत: [CERT-In screen-sharing advisory](https://www.cert-in.org.in/s2cMainServlet?VLCODE=CIAD-2020-0003&pageid=PUBVLNOTES02), [I4C National Cyber Crime Reporting Portal](https://cybercrime.gov.in), [DoT Chakshu](https://sancharsaathi.gov.in/sfc/)। आख़िरी जाँच: 23 सितम्बर 2026।`,
};

const PAGES = [ABOUT, SOURCE_POLICY, HOW_TO_CHECK];

/* ------------------------------------------------------------- सवाल-जवाब */

const FAQ = [
  {
    q: "फ़ोन पर कोई कहे कि आप “डिजिटल अरेस्ट” में हैं — क्या करूँ?",
    a: "कॉल काट दीजिए। भारत के किसी भी कानून में “डिजिटल अरेस्ट” नाम की कोई चीज़ नहीं है, और कोई भी जाँच एजेंसी वीडियो कॉल पर गिरफ़्तार नहीं करती। पैसा भेज चुके हों तो तुरंत **1930** पर कॉल कीजिए और **cybercrime.gov.in** पर शिकायत दर्ज कीजिए। पूरा तरीका [इस पोस्ट](/p/digital-arrest/) में है।",
  },
  {
    q: "खाते से बिना बताए पैसा कट गया — कितनी देर में बैंक को बताना चाहिए?",
    a: "जितनी जल्दी हो सके — देरी का सीधा असर आपकी देनदारी पर पड़ता है। RBI के ग्राहक-देनदारी नियम में समय-सीमा के हिसाब से देनदारी तय होती है, और कुछ स्थितियों में **तीन कार्यदिवस** के भीतर सूचित करने पर ग्राहक की देनदारी शून्य होती है। बैंक को लिखित में सूचित कीजिए और पावती लीजिए। शर्तें और अपवाद [इस पोस्ट](/p/golden-hour-3-din/) में दर्ज हैं।",
  },
  {
    q: "बीमा पॉलिसी गलत बताकर बेच दी गई — वापस हो सकती है?",
    a: "एक साल या उससे लंबी **जीवन बीमा पॉलिसी** पर दस्तावेज़ मिलने के बाद **30 दिन** का फ्री-लुक समय है। शर्तें मंज़ूर न हों तो रद्द करने का अनुरोध किया जा सकता है; तय कटौतियाँ लागू होती हैं। [विस्तार से](/p/free-look-30-din/)।",
  },
  {
    q: "EPF में नॉमिनेशन नहीं भरा है तो क्या होगा?",
    a: "पैसा डूबता नहीं, पर परिवार के दावे में अतिरिक्त कागज़ और देरी लग सकती है — उत्तराधिकार प्रमाणपत्र जैसी माँग आ सकती है। **e-nomination** सदस्य पोर्टल पर खुद लगभग 10 मिनट में हो जाता है। [तरीका यहाँ](/p/epf-e-nomination/)।",
  },
  {
    q: "सामान या सेवा खराब निकली — शिकायत कहाँ करूँ?",
    a: "पहले **राष्ट्रीय उपभोक्ता हेल्पलाइन 1915** पर। बात न बने तो उपभोक्ता आयोग में ऑनलाइन — अब यह **e-Jagriti** पोर्टल से होता है, जो उपभोक्ता मामले मंत्रालय का मंच है। वकील और अदालत के चक्कर ज़रूरी नहीं। [पूरा तरीका](/p/consumer-1915/)।",
  },
  {
    q: "WhatsApp पर आया कोई मैसेज या लिंक असली है या नकली — कैसे पहचानूँ?",
    a: "तीन बातें लगभग हमेशा काम करती हैं: **जल्दबाज़ी** (“24 घंटे में खाता बंद”), **डर या लालच**, और **लिंक पर जाकर जानकारी माँगना**। कोई भी सरकारी विभाग या बैंक OTP, PIN या पूरा कार्ड नंबर नहीं माँगता। शक हो तो मैसेज के लिंक पर मत जाइए — संस्था का आधिकारिक पता खुद टाइप करके खोलिए।",
  },
  {
    q: "Google/Search में दिखा customer-care number dial करूँ?",
    a: "पहले कंपनी की **official website या app** पर वही number check करें। CERT-In ने search results के customer-support numbers और अनजान screen-sharing apps से सावधान किया है। [Decision guide](/p/fake-customer-care/)। स्रोत: CERT-In advisory CIAD-2020-0003; जाँच 23 Sep 2026।",
  },
  {
    q: "Customer care वाला screen-sharing app install करवाना चाहता है — क्या करूँ?",
    a: "Call काट दें और remote-access permission न दें। CERT-In के अनुसार ऐसी access से device की activity देखी जा सकती है। अगर पहले ही access दे चुके हैं, app/permission हटाकर अपने bank को official channel से तुरंत बताएं; पैसा गया हो तो **1930** पर report करें। [पूरी बात](/p/fake-customer-care/)। स्रोत: CERT-In, I4C; जाँच 23 Sep 2026।",
  },
  {
    q: "Refund receive करने के लिए UPI PIN डालना पड़ेगा?",
    a: "**नहीं।** NPCI के अनुसार QR scan और UPI PIN payment **करने** के लिए हैं, पैसा receive करने के लिए नहीं। PIN माँगने वाला refund flow रोकें और अपने UPI app में amount/payee देखें। [समझें](/p/upi-pin-refund/)। स्रोत: NPCI Fraud Awareness; जाँच 23 Sep 2026।",
  },
  {
    q: "किसी ने payment का screenshot भेजा है — पैसे आ गए मान लूँ?",
    a: "Screenshot से पुष्टि न करें। अपने **bank/UPI app की transaction history** में credit देखकर ही सामान या सेवा दें। अगर सामने वाला ‘पहले QR scan करके PIN डालें’ कहे, रुकें। [UPI guide](/p/upi-pin-refund/)। स्रोत: NPCI Fraud Awareness; जाँच 23 Sep 2026।",
  },
  {
    q: "बिजली KYC update के नाम पर APK आया है — खोलूँ?",
    a: "**मत खोलिए।** DoT ने electricity KYC के नाम पर SMS/WhatsApp से malicious APK भेजने का pattern दर्ज किया है। Bill या connection अपने provider की official site/app से जाँचें। [क्या करें](/p/electricity-kyc-apk/)। स्रोत: DoT/PIB, 17 Jun 2024; जाँच 23 Sep 2026।",
  },
  {
    q: "संदिग्ध WhatsApp/SMS message report कहाँ करूँ अगर पैसा नहीं गया?",
    a: "DoT के **[Sanchar Saathi Chakshu](https://sancharsaathi.gov.in/sfc)** पर suspected fraud communication report कर सकते हैं। अगर पैसा चला गया या cybercrime हुआ है तो **1930** या [cybercrime.gov.in](https://cybercrime.gov.in) पर तत्काल शिकायत करें। स्रोत: DoT, I4C; जाँच 23 Sep 2026।",
  },
  {
    q: "1930 पर call करने से पैसे वापस आना पक्का है?",
    a: "**नहीं**, recovery की guarantee नहीं है। यह financial cyber fraud की तत्काल reporting का official रास्ता है। साथ में bank को भी तुरंत बताएं, complaint number और transaction proof संभालें। स्रोत: [I4C portal](https://cybercrime.gov.in); जाँच 23 Sep 2026।",
  },
  {
    q: "Boss/रिश्तेदार के असली WhatsApp से urgent payment कहें तो?",
    a: "फिर भी **पहले से ज्ञात number पर अलग call** करके पुष्टि करें। I4C ने WhatsApp session takeover और boss impersonation का pattern बताया है। अनजान ZIP/EXE attachment न खोलें। [पूरी guide](/p/boss-whatsapp-payment/)। स्रोत: I4C/PIB, 22 Jun 2026; जाँच 23 Sep 2026।",
  },
  {
    q: "WhatsApp Web में अनजान linked device दिखे तो?",
    a: "WhatsApp में **Settings > Linked devices** खोलकर अनजान session log out करें; उस account से आए payment instructions की अलग से पुष्टि करें। I4C ने linked sessions नियमित जाँचने को कहा है। [संदर्भ](/p/boss-whatsapp-payment/)। स्रोत: I4C/PIB, 22 Jun 2026; जाँच 23 Sep 2026।",
  },
  {
    q: "Bank की शिकायत पर RBI CMS कब जा सकता हूँ?",
    a: "Bank का जवाब संतोषजनक न हो, या **30 दिन** में जवाब न मिले, तो पात्रता के अनुसार [RBI CMS](https://cms.rbi.org.in) पर शिकायत कर सकते हैं। बैंक में की गई पहली शिकायत और जवाब का record रखें। [समझें](/p/golden-hour-3-din/)। स्रोत: RBI Integrated Ombudsman FAQ; जाँच 23 Sep 2026।",
  },
  {
    q: "Video like करने के बाद पैसे deposit करने को कहें तो?",
    a: "रुकें। I4C की advisory के अनुसार task scam में शुरुआती commission के बाद ज़्यादा कमाई के नाम पर पैसा जमा करवाया जाता है। Unknown account में transfer न करें। [Task scam guide](/p/task-job-scam/)। स्रोत: I4C/MHA, 6 Dec 2023; जाँच 23 Sep 2026।",
  },
  {
    q: "TRAI के नाम पर SIM बंद करने की धमकी मिले तो?",
    a: "Call काटकर अपने telecom operator के **official channel** से जाँचें। TRAI ने कहा है कि उसके नाम पर number disconnect करने की ऐसी धमकी संभावित fraud है। [विस्तार से](/p/trai-sim-threat/)। स्रोत: TRAI/DoT, 6 Jun 2024; जाँच 23 Sep 2026।",
  },
  {
    q: "Traffic e-challan का SMS आया—कहाँ जाँचूँ?",
    a: "SMS के link पर भुगतान न करें। Browser में [official eChallan portal](https://echallan.parivahan.gov.in/) खुद खोलकर challan details देखें। Mismatch होने पर संबंधित traffic office से पुष्टि करें। [Guide](/p/fake-echallan/)। स्रोत: MoRTH और MHA; जाँच 23 Sep 2026।",
  },
  {
    q: "संदिग्ध URL report कर दिया—क्या fraud complaint भी दर्ज हो गई?",
    a: "**नहीं।** I4C का [Report Suspect](https://cybercrime.gov.in/Webform/cyber_suspect.aspx) suspected URL/number जैसे identifiers दर्ज करता है। पैसा गया या crime हुआ तो bank को बताएं और 1930/cybercrime.gov.in पर victim complaint करें। [दोनों रास्ते](/p/report-suspect/)। स्रोत: I4C portal; जाँच 23 Sep 2026।",
  },
  {
    q: "Screen share app install कर ली थी—क्या सिर्फ uninstall काफ़ी है?",
    a: "Access/session बंद करें और permissions हटाएं; **सिर्फ uninstall को पूरी सुरक्षा न मानें**। Bank को official route से बताएं, account activity जाँचें और पैसा कटा हो तो 1930 पर report करें। [Action guide](/p/screen-share-containment/)। स्रोत: CERT-In, I4C; जाँच 23 Sep 2026।",
  },
  {
    q: "मेरे नाम पर कितनी SIM हैं, कहाँ दिखेंगी?",
    a: "DoT के [Sanchar Saathi](https://sancharsaathi.gov.in/) में **Know Mobile Connections in Your Name** खोलें। Official site पर verification के बाद connections देखें और जो आपका नहीं है उसे portal के जरिए report करें। [Step-by-step](/p/sim-connections-check/)। स्रोत: DoT; जाँच 23 Sep 2026।",
  },
  {
    q: "यह डेस्क कौन चलाता है?",
    a: "यह डेस्क बिना नाम के चलता है — ताकि आप बात को उसके **स्रोत** से परखें, लिखने वाले के नाम से नहीं। इसीलिए हर पोस्ट के नीचे सरकारी लिंक रहता है। वजह और तरीका [हमारे बारे में](/about/) और [स्रोत नीति](/source-policy/) में लिखा है।",
  },
  {
    q: "मेरा सवाल यहाँ नहीं है — कहाँ पूछूँ?",
    a: "X पर @seedhamatlab को सार्वजनिक reply में सवाल या सुधार बताइए। निजी जानकारी, मोबाइल नंबर या दस्तावेज़ न भेजें। यहाँ सामान्य जानकारी मिलती है, व्यक्तिगत कानूनी या वित्तीय सलाह नहीं।",
  },
];

function renderFAQ() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "hi-IN",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: plain(f.q),
      acceptedAnswer: { "@type": "Answer", text: plain(f.a.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*/g, "")) },
    })),
  };
  const items = FAQ.map((f) =>
    `    <details>
      <summary>${esc(f.q)}</summary>
      <div class="ans">${inline(f.a)}</div>
    </details>`
  ).join("\n");

  const ask = `<a class="asklink" href="${esc(SITE.x)}" target="_blank" rel="noopener"><b>सुधार बताना है?</b> — X पर @seedhamatlab को सार्वजनिक reply में बताइए। निजी जानकारी साझा न करें।</a>`;

  return head({
    title: `सवाल-जवाब — ${SITE.name}`,
    desc: "घोटाले, बैंकिंग अधिकार, बीमा, EPFO और उपभोक्ता शिकायत पर सबसे ज़्यादा पूछे जाने वाले सवालों के सीधे जवाब — स्रोत के साथ।",
    canonical: `${SITE.url}/faq/`,
  }) + `
<main id="main">
  <a class="back" href="/">← सारे पोस्ट</a>
  <article>
    <header>
      <h1>सवाल-जवाब</h1>
      <p class="standfirst">जो सवाल सबसे ज़्यादा आते हैं, उनके सीधे जवाब। हर जवाब उसी पोस्ट से जुड़ा है जहाँ स्रोत दर्ज है।</p>
    </header>
    <div class="qa">
${items}
    </div>
    ${ask}
  </article>
</main>
<script type="application/ld+json">${JSON.stringify(ld)}</script>` + foot();
}

function renderFeed(posts) {
  const items = posts.slice(0, 20).map((p) => {
    const url = `${SITE.url}/p/${encodeURIComponent(p.id)}/`;
    return `  <item>
    <title>${esc(plain(p.title))}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <pubDate>${new Date(`${p.date}T06:00:00+05:30`).toUTCString()}</pubDate>
    <category>${esc(catName(p.cat))}</category>
    <description>${esc(plain(p.summary))}</description>
  </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(SITE.name)} — ${esc(SITE.nameEn)}</title>
  <link>${SITE.url}/</link>
  <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>${esc(plain(SITE.tagline))}</description>
  <language>hi</language>
${items}
</channel>
</rss>
`;
}

function render404() {
  return head({
    title: `पेज नहीं मिला — ${SITE.name}`,
    desc: "यह पता मौजूद नहीं है।",
    canonical: SITE.url + "/",
  }) + `
<main id="main">
  <div class="listhead">404</div>
  <article><header><h1>यह पेज नहीं मिला</h1>
  <p class="standfirst">हो सकता है लिंक पुराना हो या पता गलत टाइप हुआ हो।</p></header>
  <div class="postfoot"><a class="btn" href="/">सारे पोस्ट देखें</a></div></article>
</main>` + foot();
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="10" fill="#15202B"/>
<rect x="12.5" y="12.5" width="39" height="39" rx="5" fill="none" stroke="#A62D1F" stroke-width="3"/>
<path d="M21 33.5 L28.5 41 L44 24" fill="none" stroke="#EDEFE9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* ---------------------------------------------------------------- build */

function sorted(posts) {
  return posts.slice().sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return String(b.date).localeCompare(String(a.date));
  });
}

function write(rel, content) {
  const full = path.join(__dirname, "dist", rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function main() {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "posts.json"), "utf8"));
  const posts = sorted((raw.posts || []).filter((p) => p && p.id && p.title));
  const ogCards = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "post-og.json"), "utf8"));
  for (const p of posts) {
    if (!ogCards[p.id]) throw new Error(`Missing share preview: ${p.id}`);
  }

  fs.rmSync(path.join(__dirname, "dist"), { recursive: true, force: true });

  write("index.html", renderIndex(posts));
  write("404.html", render404());
  posts.forEach((p) => write(path.join("p", p.id, "index.html"), renderPost(p, posts)));
  fs.mkdirSync(path.join(__dirname, "dist", "post-og"), { recursive: true });
  posts.forEach((p) => fs.writeFileSync(path.join(__dirname, "dist", "post-og", `${p.id}.png`), Buffer.from(ogCards[p.id], "base64")));
  PAGES.forEach((pg) => write(path.join(pg.slug, "index.html"), renderPage(pg)));
  write(path.join("faq", "index.html"), renderFAQ());

  write("feed.xml", renderFeed(posts));
  write("favicon.svg", FAVICON);
  write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

  const lastmod = posts.map((p) => p.date).sort().pop() || raw.updated || "";
  const urls = [
    { loc: `${SITE.url}/`, lastmod },
    ...posts.map((p) => ({ loc: `${SITE.url}/p/${encodeURIComponent(p.id)}/`, lastmod: p.date })),
    { loc: `${SITE.url}/faq/`, lastmod },
    ...PAGES.map((pg) => ({ loc: `${SITE.url}/${pg.slug}/`, lastmod })),
  ];
  write("sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n") +
    `\n</urlset>\n`);

  // Tasveerein assets/ me ho ya repo ki jad me — dono jagah se utha li jaati hain.
  fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });
  ["og.png", "logo.jpg", "banner.jpg"].forEach((f) => {
    const src = [path.join(__dirname, "assets", f), path.join(__dirname, f)]
      .find((c) => fs.existsSync(c));
    if (src) fs.copyFileSync(src, path.join(__dirname, "dist", f));
  });

  console.log(`बन गया: ${posts.length} पोस्ट + होम + 404 → dist/`);
}

main();
