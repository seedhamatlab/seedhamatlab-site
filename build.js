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
  youtube: "https://www.youtube.com/@seedhamatlab",
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
  "call-par-otp": { label: "CALL ALERT", icon: "☎", headline: "Call पर OTP माँगा?", points: ["OTP न बताएं", "Call काटें", "Official number पर पुष्टि"] },
  "cibil-galat-entry": { label: "KNOW YOUR RIGHT", icon: "✓", headline: "Report में गलत entry?", points: ["30 दिन में निपटारा", "देरी पर ₹100 रोज़", "फिर RBI Ombudsman"] },
  "online-fraud-kya-kare": { label: "EMERGENCY GUIDE", icon: "!", headline: "Fraud ho gaya?", points: ["Bank को तुरंत बताएं", "1930 पर report करें", "UTR और proof रखें"] },
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
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDateEn(iso) {
  const p = String(iso || "").split("-");
  if (p.length !== 3) return "";
  return `${parseInt(p[2], 10)} ${MONTHS_EN[parseInt(p[1], 10) - 1] || ""} ${p[0]}`;
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
  // [^1] -> srot ka number; *...* -> italic (sirf jab shabd se sata ho, taaki *99# jaise code na bigdein)
  out = out.replace(/\[\^(\d+)\]/g, '<sup class="ref"><a href="#src-$1">[$1]</a></sup>');
  out = out.replace(/(^|[\s(>—])\*(?=\S)([^*]+?)(?<=\S)\*(?=[\s.,;:!?)<।—]|$)/g, "$1<em>$2</em>");
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
  --accent:#0E5E57;--accent-soft:#E7F1EF;
  --band:#0E1116;--band-2:#171D25;--on-dark:#F4F5F2;--on-dark-2:#98A3AE;
  --gold:#E9B949;--gold-ink:#1A1205;
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
body{background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:16.5px;line-height:1.72;margin:0}
.wrap{max-width:920px;margin:0 auto;padding-inline:18px;padding-block:0 48px}
a{color:inherit}
button{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--verify);outline-offset:2px;border-radius:2px}
.skip{position:absolute;left:-9999px}
.skip:focus{left:18px;top:8px;background:var(--surface);border:1px solid var(--line);padding:6px 10px;border-radius:3px;z-index:10}

/* ---- dark top band: masthead + hero ---- */
.topband{background:var(--band);color:var(--on-dark)}
.topband .wrap{padding-block:0}
.topband .eyebrow{color:#76828D}
.topband .wordmark{color:var(--on-dark)}
.masthead{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-block:17px 14px}
.header-actions{display:flex;align-items:center;gap:10px}
.contact-top{font-size:13px;color:var(--gold);font-weight:600;text-decoration:none}
.menu-toggle{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);border-radius:999px;padding:8px 14px;cursor:pointer;color:var(--on-dark);font-size:17px;line-height:1.1}
.menu-toggle:hover{background:rgba(255,255,255,.13)}
.menu-toggle span{font-size:12px;vertical-align:middle;margin-left:4px}
.site-menu{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:12px;margin:0 0 16px}
.site-menu a{display:block;background:rgba(255,255,255,.06);border-radius:11px;padding:10px 13px;text-decoration:none;color:var(--on-dark);font-weight:600;font-size:14.5px}
.site-menu a:hover,.site-menu a:focus-visible{background:rgba(255,255,255,.15)}
.bandpad{padding-bottom:18px}
/* ---- hero ---- */
.landing{padding:14px 0 44px}
.landing-label{display:block;color:var(--on-dark-2);font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:500}
.landing h2{font-family:var(--sans);font-size:clamp(33px,8.7vw,60px);line-height:1.09;margin:16px 0 20px;max-width:15ch;letter-spacing:-.032em;font-weight:800;text-wrap:balance}
.landing h2 .l2{display:block;color:var(--on-dark-2)}
.landing h2 .l3{display:block;color:var(--gold)}
.landing p{color:var(--on-dark-2);font-size:16.5px;line-height:1.68;max-width:58ch;margin:0 0 24px}
.herosearch{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:7px 8px 7px 19px;max-width:580px}
.herosearch:focus-within{border-color:rgba(233,185,73,.6)}
.herosearch svg{flex:none;opacity:.5}
.herosearch input{flex:1;min-width:0;border:0;background:transparent;color:var(--on-dark);font:inherit;font-size:15.5px;outline:none;padding:0}
.herosearch input::placeholder{color:#76828D}
.herosearch .go{flex:none;background:var(--gold);color:var(--gold-ink);border:0;border-radius:999px;padding:11px 22px;font-weight:700;font-size:14.5px;cursor:pointer;font-family:var(--sans)}
.herosearch .go:hover{filter:brightness(1.07)}
.popular{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:16px}
.popular .plabel{font-size:12.5px;color:var(--on-dark-2);font-family:var(--mono);letter-spacing:.06em}
.popular a{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 14px;text-decoration:none;color:var(--on-dark);font-size:13.5px}
.popular a:hover{background:rgba(255,255,255,.15)}
.quickpaths{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:26px 0 30px}
.quickpaths a{display:block;padding:20px;border:1px solid var(--line-soft);background:var(--surface);border-radius:18px;text-decoration:none;color:var(--ink);line-height:1.5;transition:border-color .15s,transform .15s}
.quickpaths strong{display:block;font-size:16.5px;font-weight:700;letter-spacing:-.01em}
.quickpaths span{display:block;color:var(--ink-2);font-size:13px;margin-top:6px}
.quickpaths a:hover{border-color:var(--accent);transform:translateY(-2px)}
@media(max-width:610px){.quickpaths{grid-template-columns:1fr}.quickpaths a{padding:12px 15px}}
.answerbox{margin:18px 0;padding:18px 20px;border-left:3px solid var(--accent);background:var(--accent-soft);border-radius:0 14px 14px 0}
.answerbox h2{margin:0 0 5px;font-size:16px;color:var(--accent)}
.answerbox p{margin:0 0 9px;font-size:15px;line-height:1.55}
.answerbox ul{margin:0;padding-left:20px;font-size:15px}
.answerbox li{margin-bottom:3px}
.copy-status{font-size:13px;color:#0e5e57;align-self:center}
.sectionlabel{display:block;font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin:40px 0 9px}
.articles-title{font-family:var(--sans);font-weight:800;font-size:clamp(25px,5.6vw,36px);line-height:1.18;margin:0 0 8px;letter-spacing:-.025em}
@media(max-width:550px){.masthead{align-items:center}.contact-top{display:none}.stamp{display:none}.wordmark{font-size:27px}.mark{width:40px;height:40px}}
.brand{display:flex;align-items:center;gap:13px;text-decoration:none;color:inherit}
.mark{flex:none;width:40px;height:40px;border-radius:50%;display:block}
.hero{margin:6px 0 4px;border:1px solid var(--line);border-radius:5px;overflow:hidden;background:#1767bf}
.hero img{display:block;width:100%;height:auto}
.promise{display:block;padding:24px;margin:0 0 12px;border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:16px;background:var(--surface);font-family:var(--sans);font-weight:700;font-size:clamp(20px,4.4vw,30px);line-height:1.48;text-decoration:none}
.promise:before{content:"SEEDHA MATLAB  /  VERIFIED HELP";display:block;color:var(--ink-3);font:500 11px var(--mono);letter-spacing:.14em;margin-bottom:12px}
.promise .promise-more{display:block;margin-top:14px;font-size:14px;font-weight:600;color:var(--accent)}
.promise:hover{border-color:var(--accent)}
.visual{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;min-height:170px;padding:18px 20px;border-radius:15px;background:linear-gradient(152deg,#0E1116 0%,#13262A 58%,#124038 100%);color:var(--on-dark);isolation:isolate}
.visual:after{content:"";position:absolute;right:-45px;top:-55px;width:190px;height:190px;border-radius:50%;border:24px solid rgba(255,255,255,.055);z-index:-1}
.visual[data-sev="alert"]{background:linear-gradient(152deg,#140E0D 0%,#2B1512 56%,#4A1C14 100%)}
.visual .v-top{display:flex;align-items:center;justify-content:space-between;font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.16em;color:var(--gold)}
.visual[data-sev="alert"] .v-top{color:#F0A08C}
.visual .v-icon{display:grid;place-items:center;width:32px;height:32px;border:1px solid currentColor;border-radius:50%;font-size:18px;line-height:1;opacity:.85}
.visual strong{display:block;font-family:var(--sans);font-weight:700;font-size:clamp(18px,3vw,27px);line-height:1.25;letter-spacing:-.02em;max-width:30ch}
.visual ul{display:flex;gap:6px;flex-wrap:wrap;padding:0;margin:11px 0 0;list-style:none}
.visual li{padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.1);font-size:12px;line-height:1.4}
.visual small{display:block;margin-top:11px;color:var(--on-dark-2);font-family:var(--mono);font-size:10px}
.entry .visual{min-height:150px;margin-bottom:13px}
.entry:not(.pinned){grid-template-columns:54px minmax(0,1fr)}
.entry:not(.pinned) .visual{grid-column:1/-1}
.visual-feature{margin:20px 0 22px;min-height:230px;padding:22px 24px}
.visual-feature strong{font-size:clamp(23px,4vw,33px)}
.visual-feature li{font-size:14px}
.asklink{display:block;margin:16px 0 0;padding:15px 18px;border:1px solid var(--line-soft);border-left:3px solid var(--accent);border-radius:0 14px 14px 0;background:var(--surface);text-decoration:none;color:var(--ink);font-size:14.5px;line-height:1.6}
.asklink b{font-weight:700}
.asklink:hover{border-color:var(--accent)}
.crumbs{font-family:var(--mono);font-size:11.5px;color:var(--ink-3);margin:0 0 14px;display:flex;gap:7px;flex-wrap:wrap;align-items:baseline}
.crumbs a{color:var(--ink-2);text-decoration:none}
.crumbs a:hover{text-decoration:underline;text-underline-offset:3px}
.hublinks{margin-top:30px;padding-top:6px;border-top:1px solid var(--line-soft)}
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
.wordmark{font-family:var(--serif);font-size:clamp(26px,6.4vw,34px);line-height:1.08;letter-spacing:-.01em;margin:0;font-weight:400}
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
.chip[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#fff}

.listhead{font-family:var(--mono);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);padding-block:14px 6px;border-top:1px solid var(--line)}
.entry{display:grid;grid-template-columns:54px 1fr;gap:0 14px;padding:18px;background:var(--surface);border:1px solid var(--line-soft);border-radius:20px;text-decoration:none;margin:0 0 14px;box-shadow:0 10px 26px rgba(21,32,43,.05);transition:transform .15s,box-shadow .15s}
.entry:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(21,32,43,.09)}
.entry:first-of-type{border-top:0}
.meta{font-family:var(--mono);font-size:11px;color:var(--ink-3);padding-top:6px;line-height:1.5}
.meta .cdot{display:block;width:7px;height:7px;border-radius:50%;margin-bottom:6px;background:var(--ink-3)}
.entry h2{font-family:var(--serif);font-weight:400;font-size:20px;line-height:1.36;margin:0 0 4px;text-wrap:balance}
.entry:hover h2{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.entry p{margin:0;color:var(--ink-2);font-size:14.5px;line-height:1.62}
.catname{font-family:var(--mono);font-size:10px;letter-spacing:.09em;text-transform:uppercase}
.entry.pinned{grid-template-columns:1fr;border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:16px}
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

.footband{background:var(--band);color:var(--on-dark);margin-top:52px}
.footband .wrap{padding-block:0 40px}
footer{padding-top:38px}
.fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:26px}
footer h4{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin:0 0 9px;font-weight:500}
footer p{margin:0;font-size:14px;color:var(--on-dark-2);line-height:1.66}
.links{display:flex;flex-direction:column;gap:6px}
.links a{font-size:14px;color:var(--on-dark);text-decoration:none;display:flex;gap:8px;align-items:baseline}
.links a:hover{text-decoration:underline;text-underline-offset:3px}
.links .handle{font-family:var(--mono);font-size:12px;color:var(--on-dark-2)}
.fine{margin-top:28px;padding-top:16px;border-top:1px solid rgba(255,255,255,.12);font-size:12.5px;color:var(--on-dark-2)}
.copyright{display:flex;align-items:center;gap:9px;margin-top:17px;color:var(--on-dark-2);font-size:12px}
.copyright img{border-radius:50%;width:27px;height:27px}
/* ---- shabdkosh (dhancha 2): post page ---- */
.topband{overflow:hidden}
.arthero{position:relative;isolation:isolate;border-top:1px solid rgba(255,255,255,.08);padding:2px 0 26px}
.arthero:after{content:"";position:absolute;right:-78px;top:-64px;width:230px;height:230px;border-radius:50%;border:26px solid rgba(255,255,255,.045);z-index:-1}
.arthero .crumbs{color:#76828D;margin:14px 0 13px}
.arthero .crumbs a{color:var(--on-dark-2)}
.kindrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.kind{font-family:var(--mono);font-size:10.5px;font-weight:500;letter-spacing:.1em;color:var(--gold);border:1px solid rgba(233,185,73,.55);border-radius:999px;padding:3px 11px}
.verified{font-size:12.5px;font-weight:600;background:rgba(94,230,220,.12);color:#7FE6DC;border-radius:999px;padding:3px 11px}
.arthero h1{font-family:var(--sans);font-weight:800;font-size:clamp(27px,6.6vw,40px);line-height:1.2;letter-spacing:-.02em;margin:15px 0 16px;max-width:26ch;text-wrap:balance}
.one{background:rgba(255,255,255,.06);border-left:3px solid var(--gold);border-radius:0 14px 14px 0;padding:13px 17px;max-width:68ch}
.one .l{display:block;font-family:var(--mono);font-size:10.5px;font-weight:500;letter-spacing:.14em;color:var(--gold);margin-bottom:4px}
.one p{margin:0;font-size:17px;line-height:1.6;font-weight:500;color:var(--on-dark)}
.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0 4px}
@media(min-width:700px){.facts{grid-template-columns:repeat(4,minmax(0,1fr))}.facts.steps{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:699px){.facts.steps{grid-template-columns:1fr}}
.fact{background:var(--surface);border:1px solid var(--line-soft);border-radius:14px;padding:12px 14px}
.fact .k{display:block;font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.12em;color:var(--ink-3);text-transform:uppercase}
.fact .v{display:block;font-size:23px;font-weight:800;line-height:1.2;letter-spacing:-.01em;margin-top:4px}
.fact .s{display:block;font-size:13px;color:var(--ink-2);line-height:1.4;margin-top:3px}
.fact.g{background:var(--accent-soft);border-color:#BFDAD6}
.fact.g .v{color:var(--accent)}
.facts.steps .fact .v{font-size:17px;font-weight:700;line-height:1.35}
.toc{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0 2px}
.toc a{font-size:13.5px;border:1px solid var(--line);border-radius:999px;padding:3px 12px 4px;color:var(--ink-2);background:var(--surface);text-decoration:none}
.toc a:hover{border-color:var(--accent);color:var(--accent)}
.prose.wk h2{display:flex;align-items:center;gap:10px;font-family:var(--sans);font-weight:800;font-size:21px;line-height:1.3;letter-spacing:-.01em;text-transform:none;color:var(--ink);margin:30px 0 9px;scroll-margin-top:12px}
.prose.wk h2 i{flex:none;font-style:normal;font-family:var(--mono);font-size:11.5px;font-weight:500;color:#fff;background:var(--accent);border-radius:6px;padding:2px 8px;line-height:1.5}
.prose.wk em{font-style:italic}
sup.ref{font-size:11px;font-weight:700;line-height:0}
sup.ref a{color:var(--verify);text-decoration:none}
.flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--line-soft);border-radius:16px;padding:14px 10px;margin:10px 0 14px;text-align:center}
.node{border-radius:12px;padding:10px 4px;font-size:14px;font-weight:700;line-height:1.3}
.node small{display:block;font-weight:400;color:var(--ink-2);font-size:11.5px;margin-top:2px}
.n1{background:#EEF1FB;border:1px solid #CFD6F0}.n2{background:#FDF3DC;border:1px solid #EBD69B}.n3{background:var(--accent-soft);border:1px solid #BFDAD6}
.arr{font-size:11.5px;color:var(--ink-2);line-height:1.3;min-width:60px}
.arr b{display:block;font-size:14px;color:var(--ink)}
.arr span{display:block;font-size:18px;color:var(--ink-3);line-height:1}
.calc{background:var(--band);color:var(--on-dark);border-radius:16px;padding:15px 16px 13px;margin:10px 0 14px}
.calc .l{display:block;font-family:var(--mono);font-size:10.5px;font-weight:500;letter-spacing:.14em;color:var(--gold);margin-bottom:9px}
.calc .in{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:8px 13px;font-size:20px;font-weight:700;cursor:text}
.calc .in:focus-within{border-color:rgba(233,185,73,.7)}
.calc .in input{flex:1;min-width:0;width:100%;border:0;background:transparent;color:var(--on-dark);font:inherit;outline:none;padding:0}
.calc .in .hint{flex:none;color:var(--on-dark-2);font-weight:400;font-size:13px}
.calc .out{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.calc .o{background:rgba(255,255,255,.05);border-radius:12px;padding:9px 13px}
.calc .o small{display:block;color:var(--on-dark-2);font-size:12.5px}
.calc .o b{font-size:22px;font-weight:800}
.calc .o.y b{color:var(--gold)}
.calc .cnote{margin:9px 0 0;font-size:13.5px;color:#7FE6DC;min-height:1.6em}
.calc .cfine{margin:4px 0 0;font-size:12.5px;line-height:1.55;color:var(--on-dark-2)}
.mf{border-radius:14px;overflow:hidden;border:1px solid var(--line-soft);margin:0 0 11px;background:var(--surface)}
.mf .m{background:#FBEDEA;color:#7A2418;padding:10px 15px;font-size:15.5px;line-height:1.55}
.mf .f{padding:10px 15px;font-size:15.5px;line-height:1.6}
.mf b.l{display:block;font-family:var(--mono);font-size:10.5px;font-weight:500;letter-spacing:.12em;margin-bottom:2px}
.mf .f b.l{color:var(--accent)}
.rightbox{background:var(--accent-soft);border-left:3px solid var(--accent);border-radius:0 14px 14px 0;padding:13px 17px;margin:0 0 14px;font-size:16.5px;font-weight:500;line-height:1.65}
.qlist .q{border-bottom:1px solid var(--line-soft);padding:11px 0}
.qlist .q:first-child{padding-top:2px}
.qlist .q b{display:block;font-size:16.5px;font-weight:700;line-height:1.5}
.qlist .q span{display:block;font-size:15.5px;color:var(--ink-2);line-height:1.65;margin-top:2px}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin:4px 0 10px}
.chips a,.chips span{border:1px solid var(--line);border-radius:999px;padding:4px 13px;font-size:14px;color:var(--accent);background:var(--surface);text-decoration:none}
.chips .soon{border-style:dashed;color:var(--ink-3)}
.srclist{border-left:3px solid var(--verify);background:var(--surface);border-radius:0 6px 6px 0;margin:0 0 14px;padding:13px 16px 13px 44px;font-size:14.5px;counter-reset:src;list-style:none}
.srclist li{position:relative;margin-bottom:7px;counter-increment:src}
.srclist li:last-child{margin-bottom:0}
.srclist li:before{content:"[" counter(src) "]";position:absolute;left:-30px;font-weight:700;color:var(--verify);font-size:13px}
.srclist a{color:var(--ink);text-underline-offset:3px}
.srclist li:target{background:var(--accent-soft)}
.postfoot .btn{border-radius:999px;padding:8px 15px}
.btn.wa{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}
.arthero h1.term{font-size:clamp(46px,13vw,66px);line-height:1.05;margin:13px 0 4px;max-width:none}
.arthero h1.term.idx{font-size:clamp(32px,8.5vw,48px);line-height:1.15;margin-bottom:8px}
.arthero h1.term.long{font-size:clamp(29px,8.2vw,48px);line-height:1.15;margin-bottom:8px;overflow-wrap:anywhere}
.arthero .full{color:var(--on-dark-2);font-size:16px;margin:0 0 16px}
.arthero h1.idx + .full{margin-bottom:4px}
.fullart{font-size:15px;color:var(--ink-2)}
.termlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin:22px 0 8px}
.termcard{display:block;background:var(--surface);border:1px solid var(--line-soft);border-radius:16px;padding:15px 17px;text-decoration:none;color:var(--ink);transition:border-color .15s,transform .15s}
.termcard:hover{border-color:var(--accent);transform:translateY(-2px)}
.termcard .k{display:block;font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.12em;color:var(--ink-3)}
.termcard strong{display:block;font-size:25px;font-weight:800;line-height:1.25;margin-top:3px;overflow-wrap:anywhere}
.termcard .s{display:block;font-size:14px;color:var(--ink-2);line-height:1.55;margin-top:4px}
.histlist{list-style:none;margin:0 0 14px;padding:0;border-left:2px solid var(--line);font-size:15px}
.histlist li{position:relative;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;padding:3px 0 9px 16px}
.histlist li:before{content:"";position:absolute;left:-5px;top:11px;width:8px;height:8px;border-radius:50%;background:var(--accent)}
.histlist time{flex:none;font-family:var(--mono);font-size:12px;color:var(--ink-3);min-width:92px}
.histlist span{flex:1;min-width:180px;color:var(--ink-2)}
.arthero .herosearch{margin-top:16px}
.azbar{display:flex;flex-wrap:wrap;gap:5px;margin:20px 0 4px}
.azbar a,.azbar span{display:grid;place-items:center;min-width:31px;height:31px;border-radius:8px;font-family:var(--mono);font-size:13px;text-decoration:none}
.azbar a{background:var(--accent);color:#fff;font-weight:500}
.azbar span{background:var(--surface);color:var(--line);border:1px solid var(--line-soft)}
.azcount{font-family:var(--mono);font-size:11.5px;color:var(--ink-3);margin:10px 0 0}
.azletter{font-family:var(--sans);font-weight:800;font-size:22px;line-height:1;color:var(--accent);margin:22px 0 0;padding-bottom:7px;border-bottom:1px solid var(--line);scroll-margin-top:12px}
.azgroup .termlist{margin:12px 0 4px}
.empty a{color:var(--verify)}
.prose a.tl,.mf a.tl,.qlist a.tl,.rightbox a.tl{color:#1F4FA6;text-decoration:none;border-bottom:1px solid rgba(31,79,166,.35)}
.prose a.tl:hover,.prose a.tl:focus-visible{background:#EEF1FB;border-bottom-color:#1F4FA6}
.brand{min-width:0}
.wordmark{font-size:clamp(17px,5.2vw,32px);white-space:nowrap}
.flownote{font-size:13.5px;color:var(--ink-2);margin:-6px 0 14px}
.srcmeta{display:block;font-family:var(--mono);font-size:11.5px;color:var(--ink-3);margin-top:4px}
.srcusedh{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:var(--verify);margin:10px 0 4px}
.srcused{list-style:none;margin:0;padding:0;font-size:13.5px;line-height:1.5}
.srcused li{display:grid;grid-template-columns:74px minmax(0,1fr);gap:8px;padding:5px 0;border-top:1px solid var(--line-soft);margin:0;counter-increment:none}
.srcused li:before{content:none}
.srcused b{font-family:var(--mono);font-size:11.5px;font-weight:500;color:var(--verify)}
.srcused span{color:var(--ink-2)}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

/* ---------------------------------------------------------------- chrome */

function head({ title, desc, canonical, type = "website", published, home = false, hero = "", ogImage = `${SITE.url}/og.png` }) {
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
<meta property="og:site_name" content="${esc(SITE.name)} | ${esc(SITE.nameEn)}">
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
<link rel="icon" href="/icons/sm-192.png" type="image/png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0E1116">
<link rel="apple-touch-icon" href="/icons/sm-192.png">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi&family=Mukta:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">मुख्य सामग्री पर जाएँ</a>
<div class="topband">
<div class="wrap${hero ? "" : " bandpad"}">
<header class="masthead">
  <a class="brand" href="/">
    <img class="mark" src="/brand-logo.png" alt="" width="48" height="48">
    <span>
      <span class="eyebrow">${esc(SITE.eyebrow)}</span>
      ${home ? `<h1 class="wordmark">${esc(SITE.name)} | ${esc(SITE.nameEn)}</h1>` : `<p class="wordmark">${esc(SITE.name)} | ${esc(SITE.nameEn)}</p>`}
    </span>
  </a>
  <div class="header-actions"><a class="contact-top" href="mailto:${esc(SITE.email)}">Contact</a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Menu खोलें">☰ <span>Menu</span></button></div>
</header>
<nav id="site-menu" class="site-menu" aria-label="मुख्य menu" hidden>
  <a href="/">Home</a>${TERM_LINKS.re ? `<a href="/shabdkosh/">शब्दकोश</a>` : ""}<a href="/#articles">Scam Alerts / Articles</a><a href="/how-to-check/">अभी क्या करें</a><a href="/faq/">FAQ</a><a href="/about/">About</a><a href="/#contact">Contact</a>
</nav>
${hero}
</div>
</div>
<div class="wrap">
`;
}

function foot() {
  const wa = SITE.whatsapp
    ? `<a href="${esc(SITE.whatsapp)}" target="_blank" rel="noopener">WhatsApp <span class="handle">Seedha Matlab</span></a>`
    : "";
  const ig = SITE.instagram
    ? `<a href="${esc(SITE.instagram)}" target="_blank" rel="noopener">Instagram <span class="handle">@seedhamatlab</span></a>`
    : "";
  const yt = SITE.youtube
    ? `<a href="${esc(SITE.youtube)}" target="_blank" rel="noopener">YouTube <span class="handle">@seedhamatlab</span></a>`
    : "";
  return `
</div>
<div class="footband">
<div class="wrap">
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
        <a href="${esc(SITE.url)}/">Website <span class="handle">seedhamatlab.com</span></a>
        <a href="${esc(SITE.x)}" target="_blank" rel="noopener">X <span class="handle">@seedhamatlab</span></a>
        ${yt}
        ${wa}
        ${ig}
      </div>
    </div>
    <div>
      <h4>इस डेस्क के बारे में</h4>
      <div class="links">
        <a href="/scam-safety/">संदिग्ध message और स्कैम</a>
        <a href="/paise-ke-adhikar/">पैसे पर आपके अधिकार</a>
        <a href="/faq/">सवाल-जवाब</a>
        ${TERM_LINKS.re ? `<a href="/shabdkosh/">पैसे का शब्दकोश</a>` : ""}
        <a href="/about/">हमारे बारे में</a>
        <a href="/source-policy/">स्रोत नीति</a>
        <a href="/contact/">संपर्क</a>
        <a href="/privacy/">निजता नीति</a>
        <a href="/disclaimer/">ज़रूरी सूचना</a>
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
  <div class="copyright"><img src="/brand-logo.png" alt="Seedha Matlab logo" width="27" height="27"><span>© ${new Date().getFullYear()} Seedha Matlab · स्वतंत्र जन-जागरूकता सामग्री</span></div>
</footer>
</div>
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
  return `<div class="visual${feature ? " visual-feature" : ""}" data-cat="${esc(p.cat)}" data-sev="${esc(p.severity || "info")}" role="img" aria-label="${esc(`${c.headline}: ${c.points.join(', ')}`)}">
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
  function jump(){var t=document.getElementById('articles');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});}
  var go=document.getElementById('gosearch');
  if(go) go.addEventListener('click',function(){apply();jump();});
  q.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();apply();jump();}});
  [].slice.call(document.querySelectorAll('.popular a[data-q]')).forEach(function(a){
    a.addEventListener('click',function(e){e.preventDefault();q.value=a.getAttribute('data-q');apply();jump();});
  });
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

  const hero = `
  <section class="landing" aria-label="Seedha Matlab introduction">
    <span class="landing-label">स्रोत के साथ · VERIFIED HELP</span>
    <h2>पहले जाँचिए।<span class="l3">फिर सही कदम उठाइए।</span></h2>
    <p>संदिग्ध message, बैंक में कटा पैसा, बीमा या EPFO का अटका हक़ — हर जवाब के नीचे सरकारी स्रोत का लिंक, ताकि आप ख़ुद जाँच सकें।</p>
    <div class="herosearch">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <label for="q" class="skip">खोजें</label>
      <input id="q" type="search" placeholder="जैसे OTP, फ़र्ज़ी लिंक, CIBIL" autocomplete="off">
      <button class="go" type="button" id="gosearch">खोजें</button>
    </div>
    <div class="popular">
      <span class="plabel">अक्सर पूछा जाता है:</span>
      <a href="#articles" data-q="CIBIL">CIBIL रिपोर्ट</a>
      <a href="#articles" data-q="OTP">OTP</a>
      <a href="#articles" data-q="डिजिटल अरेस्ट">डिजिटल अरेस्ट</a>
      <a href="#articles" data-q="EPFO">EPFO</a>
    </div>
  </section>`;

  return head({
    title: `${SITE.name} | ${SITE.nameEn}`,
    desc: SITE.tagline,
    canonical: SITE.url + "/",
    home: true,
    hero,
  }) + `
<main id="main">
  <nav class="quickpaths" aria-label="कहाँ से शुरू करें">
    <a href="/how-to-check/"><strong>संदिग्ध message मिला?</strong><span>Link, call या offer को check करने का तरीका</span></a>
    <a href="/p/online-fraud-kya-kare/"><strong>पैसा कट गया?</strong><span>Bank और cyber fraud reporting के अगले कदम</span></a>
    <a href="#articles"><strong>Articles देखें</strong><span>Search और category से अपना सवाल चुनें</span></a>
  </nav>
  <a class="promise" href="/how-to-check/">${esc(SITE.tagline)}<span class="promise-more">कैसे verify करें? Step-by-step guide खोलें →</span></a>
  <a class="asklink" href="/faq/"><b>कोई सवाल है?</b> — सबसे ज़्यादा पूछे जाने वाले सवालों के जवाब यहाँ देखिए →</a>
  ${TERM_LINKS.re ? `<a class="asklink" href="/shabdkosh/"><b>पैसे का शब्दकोश</b> — पैसे से जुड़े शब्दों का सीधा मतलब यहाँ देखिए →</a>` : ""}
  <span class="sectionlabel" id="articles">हर लेख के नीचे सरकारी स्रोत</span>
  <h2 class="articles-title">इस समय लोग यही पूछ रहे हैं</h2>
  <div class="controls">
    <div class="cats">${chips}</div>
  </div>
  <div class="listhead" id="listhead">ताज़ा पोस्ट</div>
  <div class="listings">${posts.map(entryHTML).join("\n")}</div>
  <div class="empty" id="empty" hidden>इस खोज में कुछ नहीं मिला। कोई और शब्द आज़माइए या श्रेणी बदलिए।</div>
</main>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script>${LIST_JS}</script>` + foot();
}

/* ---- shabdkosh (dhancha 2) : post page ---- */

const inr = (n) => {
  const r = Math.round(n * 100) / 100;
  const whole = Number.isInteger(r);
  return "₹" + r.toLocaleString("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
};

// Har calculator ka niyam yahin likha hai; panne ka JS isi ko padhta hai.
const CALCS = {
  "upi-mdr": {
    label: "MDR CALCULATOR",
    start: 17700,
    free: 2000,      // is rakam tak MDR shunya
    rate: 0.004,     // 0.4%
    capFrom: 75000,  // is rakam se upar tay seema
    cap: 300,
    payLabel: "आप देंगे",
    feeLabel: "दुकानदार का MDR",
    notes: { free: "₹2,000 तक MDR शून्य", rate: "0.4% की दर से", cap: "अधिकतम सीमा ₹300 लागू" },
    fine: "यह आम दुकान (P2M) का हिसाब है। छोटे दुकानदार (P2PM) पर MDR शून्य है, और रेलवे, बीमा, petrol pump जैसी श्रेणियों में दर अलग है।",
  },
};

function calcFee(c, a) {
  if (a <= c.free) return { fee: 0, note: c.notes.free };
  if (a >= c.capFrom) return { fee: c.cap, note: c.notes.cap };
  return { fee: Math.round(a * c.rate * 100) / 100, note: c.notes.rate };
}

// Neele link: jis shabd ka apna panna hai, wo lekh ke beech me apne aap link ban jata hai.
// Ek panne me ek shabd sirf pehli baar, apne hi panne par nahi, aur quote ya doosre link ke andar nahi.
let TERM_LINKS = { re: null, map: {} };
function setTermLinks(terms) {
  const map = {};
  terms.forEach((t) => [t.term].concat(t.aliases || []).forEach((name) => {
    const k = String(name || "").trim().toLowerCase();
    if (k) map[k] = { id: t.id, href: `/shabdkosh/${encodeURIComponent(t.id)}/`, one: t.one };
  }));
  const names = Object.keys(map).sort((a, b) => b.length - a.length)
    .map((n) => esc(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const edge = "A-Za-z0-9\u0900-\u097F";
  TERM_LINKS = { map, re: names.length ? new RegExp(`(?<![${edge}])(${names.join("|")})(?![${edge}])`, "gi") : null };
}
function termLink(name) {
  return TERM_LINKS.map[String(name || "").trim().toLowerCase()] || null;
}
function autolink(html, ctx) {
  if (!TERM_LINKS.re) return html;
  let skip = 0;
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith("<")) {
      if (/^<(a|em|sup)\b/i.test(part)) skip += 1;
      else if (/^<\/(a|em|sup)>/i.test(part)) skip = Math.max(0, skip - 1);
      return part;
    }
    if (skip) return part;
    return part.replace(TERM_LINKS.re, (m) => {
      const hit = TERM_LINKS.map[m.toLowerCase()];
      if (!hit || hit.id === ctx.self || ctx.seen.has(hit.id)) return m;
      ctx.seen.add(hit.id);
      return `<a class="tl" href="${hit.href}" title="${esc(hit.one)}">${m}</a>`;
    });
  }).join("");
}

function blockHTML(p, spec, il = inline) {
  const [name, arg] = spec.split(/\s+/);
  const need = (v, what) => { if (!v || (Array.isArray(v) && !v.length)) throw new Error(`Post ${p.id}: "::${spec}" ke liye "${what}" nahi mila`); return v; };

  if (name === "flow") {
    const f = need(p.flow, "flow");
    if (!f.nodes || f.nodes.length !== 3 || !f.arrows || f.arrows.length !== 2) throw new Error(`Post ${p.id}: flow me 3 nodes aur 2 arrows chahiye`);
    const node = (n, i) => `<div class="node n${i + 1}">${esc(n.t)}<small>${esc(n.s || "")}</small></div>`;
    const arr = (a) => `<div class="arr"><b>${esc(a.b)}</b><span aria-hidden="true">→</span>${esc(a.s || "")}</div>`;
    return `<div class="flow" role="img" aria-label="${esc(f.nodes.map((n) => n.t).join(" → "))}">${node(f.nodes[0], 0)}${arr(f.arrows[0])}${node(f.nodes[1], 1)}${arr(f.arrows[1])}${node(f.nodes[2], 2)}</div>${f.note ? `<p class="flownote">${esc(f.note)}</p>` : ""}`;
  }

  if (name === "calc") {
    const c = CALCS[arg];
    if (!c) throw new Error(`Post ${p.id}: calculator "${arg}" nahi mila`);
    const r = calcFee(c, c.start);
    return `<div class="calc" data-calc='${esc(JSON.stringify({ free: c.free, rate: c.rate, capFrom: c.capFrom, cap: c.cap, notes: c.notes }))}'>
      <span class="l">${esc(c.label)}</span>
      <label class="in"><span aria-hidden="true">₹</span><input type="text" inputmode="numeric" autocomplete="off" maxlength="12" value="${c.start.toLocaleString("en-IN")}" aria-label="बिल की रक़म रुपये में"><span class="hint">बिल की रक़म डालिए</span></label>
      <div class="out" aria-live="polite">
        <div class="o"><small>${esc(c.payLabel)}</small><b data-o="pay">${inr(c.start)}</b></div>
        <div class="o y"><small>${esc(c.feeLabel)}</small><b data-o="fee">${inr(r.fee)}</b></div>
      </div>
      <p class="cnote" data-o="note">${esc(r.note)}</p>
      <p class="cfine">${esc(c.fine)}</p>
    </div>`;
  }

  if (name === "myths") {
    return need(p.myths, "myths").map((m) =>
      `<div class="mf"><div class="m"><b class="l">✕ ग़लतफ़हमी</b>${inline(m.m)}</div><div class="f"><b class="l">✓ सच</b>${il(m.f)}</div></div>`).join("");
  }

  if (name === "faq") {
    return `<div class="qlist">${need(p.faq, "faq").map((f) =>
      `<div class="q"><b>${esc(f.q)}</b><span>${il(f.a)}</span></div>`).join("")}</div>`;
  }

  if (name === "related") {
    // Jis jude shabd ka panna ban chuka hai, wo apne aap link ban jata hai; baaki par "जल्द".
    return `<div class="chips">${need(p.related, "related").map((r) => {
      const href = r.href || (termLink(r.t) || {}).href;
      return href ? `<a href="${esc(href)}">${esc(r.t)}</a>` : `<span class="soon">${esc(r.t)} · जल्द</span>`;
    }).join("")}</div>`;
  }

  throw new Error(`Post ${p.id}: anjaan block "::${spec}"`);
}

function renderBodyWiki(p, self = null) {
  const lines = String(p.body || "").split("\n");
  let html = "", list = null, para = [], n = 0;
  const toc = [];
  const ctx = { self, seen: new Set() };
  const il = (s) => autolink(inline(s), ctx);
  const flushPara = () => { if (para.length) { html += `<p>${il(para.join(" "))}</p>`; para = []; } };
  const flushList = () => { if (list) { html += `<ul>${list}</ul>`; list = null; } };
  const flush = () => { flushPara(); flushList(); };
  for (const raw of lines) {
    const ln = raw.trim();
    if (!ln) { flush(); continue; }
    if (ln.startsWith("## ")) {
      flush();
      // "## Shirshak | chhota naam" -> patti me chhota naam; "| -" -> patti me nahi
      const [t, short] = ln.slice(3).split("|").map((x) => x.trim());
      n += 1;
      if (short !== "-") toc.push({ id: `s${n}`, t: short || t });
      html += `<h2 id="s${n}"><i aria-hidden="true">${n}</i><span>${esc(t)}</span></h2>`;
    }
    else if (ln.startsWith("::")) { flush(); html += blockHTML(p, ln.slice(2).trim(), il); }
    else if (ln.startsWith("> ")) { flush(); html += `<div class="rightbox">${il(ln.slice(2))}</div>`; }
    else if (ln.startsWith("- ")) { flushPara(); list = (list || "") + `<li>${il(ln.slice(2))}</li>`; }
    else { flushList(); para.push(ln); }
  }
  flush();
  return { html, toc, n };
}

// Srot: dastavez, tareekh, aur kaun si baat dastavez ke kis hisse se li gayi (srot -> daava).
function sourcesHTML(srcs) {
  return `<ol class="srclist">${srcs.map((s, i) => {
    const dates = [s.issued ? `जारी: ${fmtDateLine(s.issued)}` : "", s.effective ? `लागू: ${fmtDateLine(s.effective)}` : ""].filter(Boolean).join(" · ");
    const used = (s.used || []).map((u) => `<li><b>${esc(u.ref)}</b><span>${esc(u.c)}</span></li>`).join("");
    return `<li id="src-${i + 1}"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>${dates ? `<span class="srcmeta">${dates}</span>` : ""}${used ? `<span class="srcusedh">किस बात के लिए, दस्तावेज़ का कौन-सा हिस्सा</span><ul class="srcused">${used}</ul>` : ""}</li>`;
  }).join("")}</ol>`;
}

// Sudhar ka itihaas: tareekh ke saath, sabse naya upar.
function historyHTML(no, rows) {
  const items = rows.filter((r) => r && r.d && r.t)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => String(b.r.d).localeCompare(String(a.r.d)) || b.i - a.i)
    .map((x) => x.r);
  if (!items.length) return "";
  return `<h2 id="hist"><i aria-hidden="true">${no}</i><span>सुधार का इतिहास</span></h2>
    <ul class="histlist">${items.map((r) => `<li><time datetime="${esc(r.d)}">${fmtDateLine(r.d)}</time><span>${inline(r.t)}</span></li>`).join("")}</ul>`;
}

const CALC_JS = `(function(){var boxes=document.querySelectorAll('.calc[data-calc]');[].forEach.call(boxes,function(box){var c=JSON.parse(box.getAttribute('data-calc')),inp=box.querySelector('input'),pay=box.querySelector('[data-o=pay]'),fee=box.querySelector('[data-o=fee]'),note=box.querySelector('[data-o=note]');function f(n){var r=Math.round(n*100)/100,w=r===Math.floor(r);return '₹'+r.toLocaleString('en-IN',{minimumFractionDigits:w?0:2,maximumFractionDigits:2});}function run(){var d=inp.value.replace(/[^0-9]/g,'').slice(0,9),a=d?parseInt(d,10):0;inp.value=d?a.toLocaleString('en-IN'):'';var m,t;if(a<=c.free){m=0;t=c.notes.free;}else if(a>=c.capFrom){m=c.cap;t=c.notes.cap;}else{m=Math.round(a*c.rate*100)/100;t=c.notes.rate;}pay.textContent=f(a);fee.textContent=f(m);note.textContent=d?t:'';}inp.addEventListener('input',run);});})();`;

function renderPost(p, all) {
  const hub = hubOf(p.cat);
  const url = `${SITE.url}/p/${encodeURIComponent(p.id)}/`;
  const points = CARDS[p.id]?.points || [];
  const srcs = p.sources || [];
  const tags = (p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  const related = all.filter((o) => o.id !== p.id && o.cat === p.cat).slice(0, 3);
  const others = (related.length ? related : all.filter((o) => o.id !== p.id).slice(0, 3));
  const checked = p.verified || p.date;

  const body = renderBodyWiki(p);
  const srcNo = body.n + 1;
  const toc = body.toc.concat(srcs.length ? [{ id: "src", t: "स्रोत" }] : []);
  const tocHTML = toc.length >= 3
    ? `<nav class="toc" aria-label="इस पन्ने में">${toc.map((s) => `<a href="#${s.id}">${esc(s.t.split(" — ")[0])}</a>`).join("")}</nav>`
    : "";

  const tiles = (p.facts && p.facts.length)
    ? `<div class="facts">${p.facts.map((f) => `<div class="fact${f.good ? " g" : ""}"><span class="k">${esc(f.k)}</span><span class="v">${esc(f.v)}</span><span class="s">${esc(f.s || "")}</span></div>`).join("")}</div>`
    : (points.length
      ? `<div class="facts steps" aria-label="अभी क्या करें">${points.slice(0, 3).map((pt, i) => `<div class="fact${i === 0 ? " g" : ""}"><span class="k">अभी क्या करें · ${i + 1}</span><span class="v">${esc(pt)}</span></div>`).join("")}</div>`
      : "");

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: plain(p.title),
    description: plain(p.summary),
    datePublished: p.date,
    dateModified: checked,
    inLanguage: "hi-IN",
    articleSection: catName(p.cat),
    mainEntityOfPage: url,
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    author: { "@type": "Organization", name: SITE.name },
  };

  const hero = `<header class="arthero">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${esc(SITE.name)}</a> <span>›</span> ${hub ? `<a href="/${hub.slug}/">${esc(hub.title)}</a> <span>›</span> ` : ""}<span>${esc(catName(p.cat))}</span></nav>
  <div class="kindrow"><span class="kind">${esc(catName(p.cat))} · ${esc(SEV[p.severity] || "जानकारी")}</span><span class="verified">✓ स्रोत से जाँचा · ${fmtDateEn(checked)}</span></div>
  <h1>${esc(p.title)}</h1>
  <div class="one"><span class="l">एक लाइन में</span><p>${esc(p.one || p.summary)}</p></div>
</header>`;

  return head({
    title: `${plain(p.title)} — ${SITE.name}`,
    desc: p.summary,
    canonical: url,
    type: "article",
    published: p.date,
    ogImage: `${SITE.url}/post-og/${encodeURIComponent(p.id)}.png`,
    hero,
  }) + `
<main id="main">
  <article>
    ${tiles}
    ${tocHTML}
    <div class="prose wk">${body.html}
    ${srcs.length ? `<h2 id="src"><i aria-hidden="true">${srcNo}</i><span>स्रोत — खुद जाँचिए</span></h2>
    ${sourcesHTML(srcs)}` : ""}
    ${historyHTML(srcNo + (srcs.length ? 1 : 0), [{ d: p.date, t: "प्रकाशित" }].concat(checked !== p.date ? [{ d: checked, t: "स्रोत से आख़िरी जाँच" }] : [], p.history || []))}
    </div>
    ${tags ? `<div class="tagrow">${tags}</div>` : ""}
    <div class="postfoot">
      <a class="btn wa" href="${esc(waShare(p.title, url))}" target="_blank" rel="noopener">WhatsApp पर भेजें</a>
      <button class="btn copy-link" type="button" data-url="${esc(url)}">Link copy करें</button><span class="copy-status" role="status" aria-live="polite"></span>
      <a class="btn" href="mailto:${esc(SITE.email)}?subject=${encodeURIComponent(`Seedha Matlab correction: ${p.title}`)}">ग़लती दिखी? सुधार बताएं</a>
      ${hub ? `<a class="btn" href="/${hub.slug}/">${esc(hub.title)} के सारे लेख</a>` : ""}
      <a class="btn" href="/">और पोस्ट पढ़ें</a>
    </div>
    <p class="verline">प्रकाशित: ${fmtDateLine(p.date)}${checked !== p.date ? ` · आख़िरी जाँच: ${fmtDateLine(checked)}` : ""}<br>
    नियम बाद में बदल सकते हैं — ऊपर दिया स्रोत खोलकर ताज़ा स्थिति देख लीजिए।<br>
    यह सामान्य जानकारी है, कानूनी या वित्तीय सलाह नहीं।</p>
  </article>
  ${others.length ? `<div class="more"><div class="listhead">इसे भी पढ़ें</div>${others.map(entryHTML).join("\n")}</div>` : ""}
</main>
<script>(function(){var b=document.querySelector('.copy-link'),s=document.querySelector('.copy-status');if(!b)return;b.addEventListener('click',async function(){try{await navigator.clipboard.writeText(b.getAttribute('data-url'));s.textContent='Link copy हो गया';}catch(e){s.textContent='Copy नहीं हुआ—browser का Share विकल्प इस्तेमाल करें';}});})();</script>
${body.html.includes('class="calc"') ? `<script>${CALC_JS}</script>` : ""}
<script type="application/ld+json">${JSON.stringify(ld)}</script>` + foot();
}

/* ---- shabdkosh: shabd ke panne (data/terms.json) ---- */

function termParts(t) {
  const body = renderBodyWiki(t, t.id);
  const srcs = t.sources || [];
  const toc = body.toc.concat(srcs.length ? [{ id: "src", t: "स्रोत" }] : []);
  return { body, srcs, toc, srcNo: body.n + 1 };
}

function renderTerm(t, posts) {
  const url = `${SITE.url}/shabdkosh/${encodeURIComponent(t.id)}/`;
  const { body, srcs, toc, srcNo } = termParts(t);
  const art = t.article ? posts.find((p) => p.id === t.article) : null;
  if (t.article && !art) throw new Error(`Term ${t.id}: lekh "${t.article}" nahi mila`);
  const checked = t.verified || t.created;
  const shareTitle = `${t.term} का मतलब: ${t.one}`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: t.term,
    alternateName: t.fullEn || undefined,
    description: plain(t.one),
    url,
    inLanguage: "hi-IN",
    inDefinedTermSet: `${SITE.url}/shabdkosh/`,
  };

  const hero = `<header class="arthero">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${esc(SITE.name)}</a> <span>›</span> <a href="/shabdkosh/">शब्दकोश</a> <span>›</span> <span>${esc(t.group)}</span> <span>›</span> <span>${esc(t.term)}</span></nav>
  <div class="kindrow"><span class="kind">शब्द · ${esc(t.group)}</span><span class="verified">✓ स्रोत से जाँचा · ${fmtDateEn(checked)}</span></div>
  <h1 class="term${String(t.term).length > 10 ? " long" : ""}">${esc(t.term)}</h1>
  <p class="full">${esc(t.full)}</p>
  <div class="one"><span class="l">एक लाइन में</span><p>${esc(t.one)}</p></div>
</header>`;

  return head({
    title: `${t.term} का मतलब क्या है? ${t.fullEn ? t.fullEn + " — " : ""}${SITE.name}`,
    desc: t.one,
    canonical: url,
    type: "article",
    published: t.created,
    hero,
  }) + `
<main id="main">
  <article>
    <div class="facts">${(t.facts || []).map((f) => `<div class="fact${f.good ? " g" : ""}"><span class="k">${esc(f.k)}</span><span class="v">${esc(f.v)}</span><span class="s">${esc(f.s || "")}</span></div>`).join("")}</div>
    <nav class="toc" aria-label="इस पन्ने में">${toc.map((s) => `<a href="#${s.id}">${esc(s.t)}</a>`).join("")}</nav>
    <div class="prose wk">${body.html}
    ${art ? `<p class="fullart">पूरा लेख: <a href="/p/${encodeURIComponent(art.id)}/">${esc(t.articleLabel || art.title)}</a></p>` : ""}
    <h2 id="src"><i aria-hidden="true">${srcNo}</i><span>स्रोत</span></h2>
    ${sourcesHTML(srcs)}
    ${historyHTML(srcNo + 1, (t.history && t.history.length) ? t.history : [{ d: t.created, t: "पन्ना बना" }])}
    </div>
    <div class="postfoot">
      <a class="btn wa" href="${esc(waShare(shareTitle, url))}" target="_blank" rel="noopener">WhatsApp पर भेजें</a>
      <button class="btn copy-link" type="button" data-url="${esc(url)}">Link copy करें</button><span class="copy-status" role="status" aria-live="polite"></span>
      <a class="btn" href="mailto:${esc(SITE.email)}?subject=${encodeURIComponent(`Seedha Matlab correction: ${t.term}`)}">ग़लती दिखी? सुधार बताएं</a>
    </div>
    <p class="verline">पन्ना बना: ${fmtDateLine(t.created)} · आख़िरी जाँच: ${fmtDateLine(checked)}<br>
    यह सामान्य जानकारी है, कानूनी या वित्तीय सलाह नहीं।</p>
  </article>
</main>
<script>(function(){var b=document.querySelector('.copy-link'),s=document.querySelector('.copy-status');if(!b)return;b.addEventListener('click',async function(){try{await navigator.clipboard.writeText(b.getAttribute('data-url'));s.textContent='Link copy हो गया';}catch(e){s.textContent='Copy नहीं हुआ—browser का Share विकल्प इस्तेमाल करें';}});})();</script>
${body.html.includes('class="calc"') ? `<script>${CALC_JS}</script>` : ""}
<script type="application/ld+json">${JSON.stringify(ld)}</script>` + foot();
}

const TERM_LIST_JS = `(function(){var q=document.getElementById('tq');if(!q)return;var cards=[].slice.call(document.querySelectorAll('.termcard')),groups=[].slice.call(document.querySelectorAll('.azgroup')),empty=document.getElementById('tempty'),count=document.getElementById('tcount'),bar=document.querySelector('.azbar');function run(){var v=q.value.trim().toLowerCase(),n=0;cards.forEach(function(c){var ok=!v||c.getAttribute('data-text').indexOf(v)>-1;c.hidden=!ok;if(ok)n++;});groups.forEach(function(g){g.hidden=!g.querySelector('.termcard:not([hidden])');});empty.hidden=n>0;bar.hidden=!!v;count.textContent=v?('नतीजे: '+n):('कुल शब्द: '+cards.length);}q.addEventListener('input',run);})();`;

function renderTermIndex(terms) {
  const url = `${SITE.url}/shabdkosh/`;
  const key = (t) => String(t.sort || t.term).trim();
  const letterOf = (t) => { const c = key(t).charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : /[0-9]/.test(c) ? "0–9" : "अ"; };
  const list = terms.slice().sort((a, b) => key(a).localeCompare(key(b), "en", { sensitivity: "base" }));
  const groups = {};
  list.forEach((t) => { const L = letterOf(t); (groups[L] = groups[L] || []).push(t); });
  const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const idOf = (L) => (L === "अ" ? "az-hi" : L === "0–9" ? "az-09" : `az-${L}`);
  const bar = (groups["0–9"] ? ["0–9"] : []).concat(AZ, groups["अ"] ? ["अ"] : []).map((L) => groups[L] ? `<a href="#${idOf(L)}">${L}</a>` : `<span aria-hidden="true">${L}</span>`).join("");
  const card = (t) => `<a class="termcard" href="/shabdkosh/${encodeURIComponent(t.id)}/" data-text="${esc([t.term, t.full, t.fullEn, t.one, (t.aliases || []).join(" ")].join(" ").toLowerCase())}">
    <span class="k">शब्द · ${esc(t.group)}</span>
    <strong>${esc(t.term)}</strong>
    <span class="s">${esc(t.one)}</span>
  </a>`;
  const hero = `<header class="arthero">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${esc(SITE.name)}</a> <span>›</span> <span>शब्दकोश</span></nav>
  <h1 class="term idx">पैसे का शब्दकोश</h1>
  <p class="full">पैसे से जुड़े शब्द, सीधी भाषा में। हर पन्ने के नीचे सरकारी स्रोत।</p>
  <div class="herosearch" role="search">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
    <label for="tq" class="skip">शब्द खोजिए</label>
    <input id="tq" type="search" placeholder="शब्द खोजिए, जैसे MDR" autocomplete="off">
  </div>
</header>`;
  return head({
    title: `पैसे का शब्दकोश — ${SITE.name}`,
    desc: "पैसे से जुड़े शब्द, सीधी भाषा में। हर पन्ने के नीचे सरकारी स्रोत।",
    canonical: url,
    hero,
  }) + `
<main id="main">
  <nav class="azbar" aria-label="A से Z">${bar}</nav>
  <p class="azcount" id="tcount" role="status" aria-live="polite">कुल शब्द: ${list.length}</p>
  ${["0–9"].concat(AZ, ["अ"]).filter((L) => groups[L]).map((L) => `<section class="azgroup" id="${idOf(L)}" aria-label="${L}">
    <h2 class="azletter">${L}</h2>
    <div class="termlist">${groups[L].map(card).join("")}</div>
  </section>`).join("")}
  <p class="empty" id="tempty" hidden>यह शब्द अभी शब्दकोश में नहीं है। <a href="mailto:${esc(SITE.email)}?subject=${encodeURIComponent("Seedha Matlab: yeh shabd jodiye")}">कौन-सा शब्द चाहिए, बताइए</a></p>
</main>
<script>${TERM_LIST_JS}</script>` + foot();
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
- **अभी कुछ बेचता नहीं।** इस समय साइट पर कोई विज्ञापन, प्रायोजित पोस्ट या बैंक/बीमा का रेफरल लिंक नहीं है। आगे अगर साइट चलाने का खर्च निकालने के लिए विज्ञापन जोड़े गए, तो वह इसी पन्ने पर और [निजता नीति](/privacy/) में साफ़ लिखा जाएगा — चुपचाप नहीं। और किसी भी पैसे वाले रिश्ते से यहाँ लिखी बात नहीं बदलेगी।

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
- कोई विज्ञापन, प्रायोजित सामग्री या रेफरल लिंक — अभी इनमें से कुछ भी साइट पर नहीं है। आगे कभी जोड़ा गया तो [हमारे बारे में](/about/) और [निजता नीति](/privacy/) में पहले लिखा जाएगा, और वह कभी तय नहीं करेगा कि यहाँ क्या सही बताया जाए

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

const CONTACT = {
  slug: "contact",
  title: "संपर्क",
  desc: "सुधार बताने, सवाल भेजने या किसी संदिग्ध message की जाँच माँगने के लिए सीधा रास्ता।",
  body: `## कहाँ लिखें

**ईमेल — ${SITE.email}**
सबसे भरोसेमंद रास्ता। सुधार, सवाल या किसी संदिग्ध message की जाँच — सब यहीं भेजिए।

**X — [@seedhamatlab](${SITE.x})**
सार्वजनिक reply में तथ्य की गलती बताइए। यही सबसे तेज़ है।

${SITE.whatsapp ? `**WhatsApp Channel — [जुड़िए](${SITE.whatsapp})**\nनए alert सीधे मिलेंगे।` : ""}

${SITE.youtube ? `**YouTube — [@seedhamatlab](${SITE.youtube})**\nछोटे वीडियो में स्कैम और नियमों की सीधी जानकारी।` : ""}

## किस बात के लिए लिखें

- **कोई तथ्य गलत लगे** — यही सबसे ज़रूरी है। स्रोत का लिंक साथ भेजिए तो सुधार जल्दी होगा
- **कोई संदिग्ध message, link या call** मिला हो जिसकी जाँच यहाँ नहीं है
- **कोई सवाल** जो [सवाल-जवाब](/faq/) पन्ने पर नहीं मिला

## लिखने से पहले यह ज़रूर पढ़िए

- **यह कोई सरकारी, बैंक, पुलिस या नियामक कार्यालय नहीं है।** यहाँ लिखने से कोई शिकायत दर्ज नहीं होती
- **अपनी निजी जानकारी मत भेजिए** — खाता संख्या, कार्ड नंबर, OTP, PIN, पासवर्ड, आधार या कोई भी दस्तावेज़। इनकी यहाँ कभी ज़रूरत नहीं पड़ेगी, और कोई माँगे तो वह धोखा है
- **किसी एक केस की कानूनी या वित्तीय सलाह यहाँ नहीं मिलती।** यहाँ जो है वह सामान्य जानकारी है

## अगर अभी धोखाधड़ी हुई है

ईमेल का इंतज़ार मत कीजिए। **1930** पर कॉल कीजिए या **[cybercrime.gov.in](https://cybercrime.gov.in)** पर report दर्ज कीजिए, और अपने बैंक को उसके आधिकारिक नंबर से तुरंत बताइए। पूरा तरीका [यहाँ](/p/online-fraud-kya-kare/) है।

## जवाब के बारे में सच

यह डेस्क एक छोटी सी कोशिश है। हर संदेश का जवाब देना हमेशा संभव नहीं होता, और कोई तय समय-सीमा नहीं है। पर **तथ्य की गलती बताने वाला हर संदेश पढ़ा जाता है** — और गलती मिलने पर सुधार उसी पोस्ट में किया जाता है, चुपचाप नहीं। तरीका [स्रोत नीति](/source-policy/) में लिखा है।`,
};

const PRIVACY = {
  slug: "privacy",
  title: "निजता नीति",
  desc: "यह साइट आपसे क्या नहीं माँगती, क्या अपने आप दर्ज होता है, और कौन-सी बाहरी सेवाएँ इस्तेमाल होती हैं।",
  body: `**आख़िरी बदलाव:** 25 सितम्बर 2026

## सबसे पहले, छोटा जवाब

**यह साइट आपसे कोई जानकारी नहीं माँगती।** यहाँ न कोई खाता बनता है, न login है, न कोई form भरना पड़ता है। पढ़ने के लिए आपको कुछ भी देना नहीं है।

## क्या अपने आप दर्ज होता है

**पढ़ने की गिनती।** हम Cloudflare Web Analytics इस्तेमाल करते हैं — कौन-सा पन्ना कितनी बार खुला, बस इतना। Cloudflare की अपनी बात है कि वह **अलग-अलग visitors को track नहीं करता**, और इसके लिए **कोई cookie नहीं** लगती। हमें यह नहीं दिखता कि आप कौन हैं।

**Server logs.** साइट Cloudflare पर है। हर website की तरह यहाँ भी तकनीकी और सुरक्षा logs बनते हैं (जैसे IP पता, browser का नाम)। ये Cloudflare के पास उसकी अपनी नीति के तहत रहते हैं, हम इन्हें अलग से इकट्ठा या इस्तेमाल नहीं करते।

## बाहरी सेवाएँ — यह भी जान लीजिए

**Google Fonts.** पन्ने के अक्षर Google के fonts server से आते हैं। इसका मतलब यह है कि पन्ना खुलते समय आपका browser Google से एक request करता है, और उसमें आपका IP पता Google तक जाता है। यह हर उस साइट पर होता है जो Google Fonts इस्तेमाल करती है, पर आपको पता होना चाहिए।

**बाहर के लिंक.** हर पोस्ट के नीचे सरकारी स्रोत के लिंक रहते हैं (RBI, EPFO, cybercrime.gov.in वग़ैरह)। उन पर जाने के बाद उनकी अपनी नीति लागू होती है, हमारी नहीं।

## ईमेल

आप हमें [ईमेल](/contact/) करते हैं तो आपका पता और संदेश हमें मिलता है — सिर्फ़ जवाब देने के लिए। हम उसे किसी को बेचते या साझा नहीं करते।

**कृपया ईमेल में भी अपनी निजी जानकारी मत भेजिए** — खाता संख्या, कार्ड नंबर, OTP, PIN, पासवर्ड या आधार। इनकी कभी ज़रूरत नहीं पड़ेगी।

## जो यहाँ नहीं है

- कोई विज्ञापन network नहीं
- कोई tracking pixel, retargeting या advertising cookie नहीं
- कोई newsletter sign-up या mailing list नहीं
- आपकी जानकारी किसी को बेची नहीं जाती — क्योंकि इकट्ठी ही नहीं होती

## आगे अगर कुछ बदले

अगर कभी साइट चलाने का खर्च निकालने के लिए विज्ञापन या कोई और सेवा जोड़ी गई, तो **पहले यह पन्ना बदला जाएगा** — और [हमारे बारे में](/about/) पन्ने पर भी साफ़ लिखा जाएगा। चुपचाप नहीं।

कोई सवाल हो तो [संपर्क](/contact/) कीजिए।`,
};

const DISCLAIMER = {
  slug: "disclaimer",
  title: "ज़रूरी सूचना",
  desc: "यह डेस्क क्या है और क्या नहीं — किस बात पर भरोसा कीजिए, और कहाँ अपने स्रोत से पुष्टि ज़रूरी है।",
  body: `## यह कोई आधिकारिक संस्था नहीं है

**सीधा मतलब एक स्वतंत्र जन-जागरूकता डेस्क है।** यह कोई सरकारी विभाग, बैंक, पुलिस, अदालत या नियामक (RBI, IRDAI, EPFO, SEBI) **नहीं** है, न ही इनसे किसी तरह जुड़ा है। यहाँ न कोई शिकायत दर्ज होती है, न कोई मामला आगे बढ़ता है।

## यह सामान्य जानकारी है, सलाह नहीं

यहाँ जो लिखा है वह आम लोगों के लिए सरल भाषा में समझाई गई सार्वजनिक जानकारी है। यह **कानूनी, वित्तीय, बीमा या कर सलाह नहीं है**, और आपके अपने मामले को देखकर नहीं लिखी गई। कोई बड़ा फ़ैसला लेने से पहले आधिकारिक स्रोत या योग्य पेशेवर से पुष्टि कीजिए।

## नियम बदलते रहते हैं

हर पोस्ट पर तारीख़ दर्ज है और नीचे आधिकारिक स्रोत का लिंक रहता है। नियम उसके बाद बदल सकता है। **स्रोत वाला लिंक खोलकर ताज़ा स्थिति देख लेना आपकी सुरक्षा है** — यही इस डेस्क का पूरा तरीका है।

## गलती हो सकती है

पूरी कोशिश के बाद भी गलती हो सकती है। गलती मिलने पर सुधार **उसी पोस्ट में** किया जाता है, चुपचाप हटाया नहीं जाता। कुछ गलत दिखे तो ज़रूर [बताइए](/contact/) — तरीका [स्रोत नीति](/source-policy/) में है।

इस जानकारी के आधार पर लिए गए फ़ैसलों और उनके नतीजों की ज़िम्मेदारी पाठक की अपनी है।

## बाहर के लिंक

सरकारी और आधिकारिक लिंक सुविधा के लिए दिए जाते हैं। उन पन्नों की सामग्री उनकी अपनी है और वे बिना बताए बदल सकते हैं।

## आपात स्थिति में

अगर अभी धोखाधड़ी हुई है, तो यह पन्ना पढ़ते रहने का समय नहीं है — **1930** पर कॉल कीजिए या **[cybercrime.gov.in](https://cybercrime.gov.in)** पर report कीजिए, और बैंक को उसके आधिकारिक नंबर से तुरंत बताइए।`,
};

const PAGES = [ABOUT, SOURCE_POLICY, HOW_TO_CHECK, CONTACT, PRIVACY, DISCLAIMER];

/* ------------------------------------------------------------------ hubs */

const HUBS = [
  {
    slug: "scam-safety",
    title: "संदिग्ध message और साइबर स्कैम",
    desc: "WhatsApp/SMS पर आए संदिग्ध message, link, call और APK — पहचान, जाँच और fraud के बाद का पहला कदम। हर लेख में आधिकारिक स्रोत।",
    lead: "यहाँ वे सारे लेख एक जगह हैं जो संदिग्ध संदेश पहचानने, उसे स्रोत से जाँचने और धोखाधड़ी हो जाने पर तुरंत उठाए जाने वाले कदमों पर हैं।",
    cats: ["scam"],
    first: ["online-fraud-kya-kare"],
  },
  {
    slug: "paise-ke-adhikar",
    title: "आपके पैसे पर आपके अधिकार",
    desc: "बैंक, बीमा, EPFO और उपभोक्ता नियम — नुकसान होने पर आपका हक़ क्या है, समय-सीमा क्या है और शिकायत कहाँ होती है।",
    lead: "नियम आपके पक्ष में तब काम करते हैं जब आप उन्हें समय पर इस्तेमाल करें। इन लेखों में हर बात के साथ समय-सीमा और आधिकारिक शिकायत का रास्ता दर्ज है।",
    cats: ["bank", "insurance", "epfo", "consumer"],
    first: [],
  },
];

const hubOf = (cat) => HUBS.find((h) => h.cats.includes(cat));

function hubPosts(hub, posts) {
  const inHub = posts.filter((p) => hub.cats.includes(p.cat));
  const lead = hub.first.map((id) => inHub.find((p) => p.id === id)).filter(Boolean);
  const rest = inHub.filter((p) => !lead.includes(p));
  return [...lead, ...rest];
}

function renderHub(hub, posts) {
  const list = hubPosts(hub, posts);
  const others = HUBS.filter((h) => h.slug !== hub.slug);
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE.name, item: `${SITE.url}/` },
      { "@type": "ListItem", position: 2, name: plain(hub.title), item: `${SITE.url}/${hub.slug}/` },
    ],
  };
  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: plain(hub.title),
    description: plain(hub.desc),
    url: `${SITE.url}/${hub.slug}/`,
    inLanguage: "hi-IN",
  };

  return head({
    title: `${plain(hub.title)} — ${SITE.name}`,
    desc: hub.desc,
    canonical: `${SITE.url}/${hub.slug}/`,
  }) + `
<main id="main">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${esc(SITE.name)}</a> <span>›</span> <span>${esc(hub.title)}</span></nav>
  <article>
    <header>
      <h1>${esc(hub.title)}</h1>
      <p class="standfirst">${esc(hub.lead)}</p>
    </header>
  </article>
  <div class="listhead">${list.length} लेख</div>
  ${list.map(entryHTML).join("\n")}
  <div class="hublinks">
    <div class="listhead">दूसरे विषय</div>
    <div class="links">
      ${others.map((h) => `<a href="/${h.slug}/">${esc(h.title)}</a>`).join("\n      ")}
      <a href="/faq/">सवाल-जवाब</a>
    </div>
  </div>
</main>
<script type="application/ld+json">${JSON.stringify(crumbs)}</script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>` + foot();
}

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
  <title>${esc(SITE.name)} | ${esc(SITE.nameEn)}</title>
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

  // Shabdkosh: data/terms.json ke shabd. Pehle padhte hain taaki lekhon me neele link ban saken.
  const termsFile = path.join(__dirname, "data", "terms.json");
  const terms = fs.existsSync(termsFile) ? (JSON.parse(fs.readFileSync(termsFile, "utf8")).terms || []) : [];
  setTermLinks(terms);

  fs.rmSync(path.join(__dirname, "dist"), { recursive: true, force: true });

  write("index.html", renderIndex(posts));
  write("404.html", render404());
  posts.forEach((p) => write(path.join("p", p.id, "index.html"), renderPost(p, posts)));
  fs.mkdirSync(path.join(__dirname, "dist", "post-og"), { recursive: true });
  posts.forEach((p) => fs.writeFileSync(path.join(__dirname, "dist", "post-og", `${p.id}.png`), Buffer.from(ogCards[p.id], "base64")));
  PAGES.forEach((pg) => write(path.join(pg.slug, "index.html"), renderPage(pg)));
  HUBS.forEach((h) => write(path.join(h.slug, "index.html"), renderHub(h, posts)));
  write(path.join("faq", "index.html"), renderFAQ());
  terms.forEach((t) => write(path.join("shabdkosh", t.id, "index.html"), renderTerm(t, posts)));
  if (terms.length) write(path.join("shabdkosh", "index.html"), renderTermIndex(terms));

  write("feed.xml", renderFeed(posts));
  write("manifest.webmanifest", JSON.stringify({
    id: "/",
    name: "सीधा मतलब | Seedha Matlab",
    short_name: "सीधा मतलब",
    description: SITE.tagline,
    lang: "hi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#EDEFE9",
    theme_color: "#15202B",
    icons: [
      { src: "/icons/sm-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/sm-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/sm-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }));
  write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

  const urls = [
    { loc: `${SITE.url}/` },
    ...posts.map((p) => ({ loc: `${SITE.url}/p/${encodeURIComponent(p.id)}/`, lastmod: p.date })),
    { loc: `${SITE.url}/faq/` },
    ...(terms.length ? [{ loc: `${SITE.url}/shabdkosh/` }] : []),
    ...terms.map((t) => ({ loc: `${SITE.url}/shabdkosh/${encodeURIComponent(t.id)}/`, lastmod: t.verified || t.created })),
    ...HUBS.map((h) => ({ loc: `${SITE.url}/${h.slug}/` })),
    ...PAGES.map((pg) => ({ loc: `${SITE.url}/${pg.slug}/` })),
  ];
  write("sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n") +
    `\n</urlset>\n`);

  // Tasveerein assets/ me ho ya repo ki jad me — dono jagah se utha li jaati hain.
  fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });
  ["og.png", "logo.jpg", "banner.jpg", "brand-logo.png"].forEach((f) => {
    const src = [path.join(__dirname, "assets", f), path.join(__dirname, f)]
      .find((c) => fs.existsSync(c));
    if (src) fs.copyFileSync(src, path.join(__dirname, "dist", f));
  });
  for (const f of ["sm-192.png", "sm-512.png", "sm-maskable-512.png"]) {
    const src = path.join(__dirname, "icons", f);
    if (!fs.existsSync(src)) throw new Error(`Missing PWA icon: ${src}`);
    fs.mkdirSync(path.join(__dirname, "dist", "icons"), { recursive: true });
    fs.copyFileSync(src, path.join(__dirname, "dist", "icons", f));
  }

  console.log(`बन गया: ${posts.length} पोस्ट + होम + 404 → dist/`);
}

main();
