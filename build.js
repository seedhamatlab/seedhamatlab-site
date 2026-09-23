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
  tagline: "घोटाले, बैंकिंग अधिकार और उपभोक्ता नियम — सीधी भाषा में, स्रोत के साथ।",
  eyebrow: "सूचना डेस्क · भारत",
  instagram: "", // Instagram handle abhi nahi hai — link yahan daalein tabhi footer me dikhega
  x: "https://x.com/seedhamatlab",
  whatsapp: "https://whatsapp.com/channel/0029Vb9DXQb3gvWW4lRkkq3r",
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
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
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
  color-scheme:light dark;
}
@media (prefers-color-scheme:dark){
  :root{
    --paper:#11161A;--surface:#181E23;--ink:#E7EAE3;--ink-2:#A5AFA7;--ink-3:#7E8A83;
    --line:#2B333A;--line-soft:#232A30;--stamp:#E07A66;--verify:#5FBBAA;
    --c-scam:#E07A66;--c-bank:#7FA6E8;--c-consumer:#D19A54;--c-insurance:#AE8FE0;--c-epfo:#5FBBAA;
    --shadow:0 1px 0 rgba(0,0,0,.3);
  }
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:16.5px;line-height:1.72;margin:0}
.wrap{max-width:720px;margin:0 auto;padding-inline:18px;padding-block:0 48px}
a{color:inherit}
button{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--verify);outline-offset:2px;border-radius:2px}
.skip{position:absolute;left:-9999px}
.skip:focus{left:18px;top:8px;background:var(--surface);border:1px solid var(--line);padding:6px 10px;border-radius:3px;z-index:10}

.masthead{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-block:26px 14px}
.brand{display:flex;align-items:center;gap:13px;text-decoration:none;color:inherit}
.mark{flex:none;width:48px;height:48px;border-radius:50%;display:block}
.hero{margin:6px 0 4px;border:1px solid var(--line);border-radius:5px;overflow:hidden;background:#0d1b2a}
.hero img{display:block;width:100%;height:auto}
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
.chip[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--paper)}

.listhead{font-family:var(--mono);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);padding-block:14px 6px;border-top:1px solid var(--line)}
.entry{display:grid;grid-template-columns:54px 1fr;gap:0 14px;padding-block:18px;border-top:1px solid var(--line-soft);text-decoration:none}
.entry:first-of-type{border-top:0}
.meta{font-family:var(--mono);font-size:11px;color:var(--ink-3);padding-top:6px;line-height:1.5}
.meta .cdot{display:block;width:7px;height:7px;border-radius:50%;margin-bottom:6px;background:var(--ink-3)}
.entry h2{font-family:var(--serif);font-weight:400;font-size:20px;line-height:1.36;margin:0 0 4px;text-wrap:balance}
.entry:hover h2{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.entry p{margin:0;color:var(--ink-2);font-size:14.5px;line-height:1.62}
.catname{font-family:var(--mono);font-size:10px;letter-spacing:.09em;text-transform:uppercase}
.entry.pinned{grid-template-columns:1fr;background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--stamp);border-radius:0 3px 3px 0;padding:16px 16px 18px;margin-bottom:6px;box-shadow:var(--shadow)}
.alertlabel{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--stamp);margin-bottom:5px;display:block}
.empty{padding:34px 0;color:var(--ink-3);font-size:15px;border-top:1px solid var(--line-soft)}

.back{display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-family:var(--mono);font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-2);padding:14px 0}
.back:hover{color:var(--ink)}
article header{border-top:1px solid var(--line);padding-top:20px}
.postmeta{font-family:var(--mono);font-size:11px;letter-spacing:.07em;color:var(--ink-3);display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
article h1{font-family:var(--serif);font-weight:400;font-size:clamp(25px,6.4vw,33px);line-height:1.3;margin:0 0 12px;text-wrap:balance}
.standfirst{font-size:17px;line-height:1.66;color:var(--ink-2);margin:0 0 4px}
.prose{max-width:62ch}
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
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

/* ---------------------------------------------------------------- chrome */

function head({ title, desc, canonical, type = "website", published, home = false }) {
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
<meta property="og:image" content="${SITE.url}/og.png">
<meta property="og:locale" content="hi_IN">
<meta name="twitter:card" content="summary_large_image">
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
    </span>
  </a>
  <div class="stamp"><b>स्रोत</b>सहित</div>
</header>
<hr class="rule">
<hr class="rule-thin">
<div class="kicker">
  <span>घोटाले · बैंकिंग अधिकार · उपभोक्ता · बीमा · EPFO</span>
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
<footer>
  <div class="fgrid">
    <div>
      <h4>यह डेस्क क्या है</h4>
      <p>नियम और चेतावनियाँ सीधी भाषा में — बिना डर बेचे, बिना वायरल किए। हर पोस्ट के नीचे सरकारी स्रोत का लिंक रहता है ताकि आप खुद जाँच सकें।</p>
    </div>
    <div>
      <h4>कहाँ मिलेंगे</h4>
      <div class="links">
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
</footer>
</div>
${SITE.cfAnalytics ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${esc(SITE.cfAnalytics)}"}'></script>` : ""}
</body>
</html>`;
}

/* ---------------------------------------------------------------- pages */

function entryHTML(p) {
  const hay = esc([p.title, p.summary, (p.tags || []).join(" "), catName(p.cat)].join(" ").toLowerCase());
  const href = `/p/${encodeURIComponent(p.id)}/`;
  if (p.pinned) {
    return `<a class="entry pinned" href="${href}" data-cat="${esc(p.cat)}" data-text="${hay}">
  <div>
    <span class="alertlabel">ताज़ा ${esc(SEV[p.severity] || "जानकारी")} · ${fmtDateLine(p.date)}</span>
    <h2>${esc(p.title)}</h2>
    <p>${esc(p.summary)}</p>
  </div>
</a>`;
  }
  return `<a class="entry" href="${href}" data-cat="${esc(p.cat)}" data-text="${hay}">
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
  <div class="hero"><img src="/banner.jpg" alt="${esc(SITE.name)} — ${esc(plain(SITE.tagline))}" width="1600" height="535"></div>
  <a class="asklink" href="/faq/"><b>कोई सवाल है?</b> — सबसे ज़्यादा पूछे जाने वाले सवालों के जवाब यहाँ देखिए →</a>
  <div class="controls">
    <div class="search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <label for="q" class="skip">खोजें</label>
      <input id="q" type="search" placeholder="खोजें — जैसे OTP, पेंशन, बीमा" autocomplete="off">
    </div>
    <div class="cats">${chips}</div>
  </div>
  <div class="listhead" id="listhead">ताज़ा पोस्ट</div>
  ${posts.map(entryHTML).join("\n")}
  <div class="empty" id="empty" hidden>इस खोज में कुछ नहीं मिला। कोई और शब्द आज़माइए या श्रेणी बदलिए।</div>
</main>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script>${LIST_JS}</script>` + foot();
}

function renderPost(p, all) {
  const url = `${SITE.url}/p/${encodeURIComponent(p.id)}/`;
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
      <p class="standfirst">${esc(p.summary)}</p>
    </header>
    <div class="prose">${renderBody(p.body)}</div>
    ${sources ? `<div class="sources"><h3>स्रोत — खुद जाँचिए</h3>${sources}</div>` : ""}
    <p class="verline">स्रोत: ${esc((p.sources || []).map((s) => s.label).join(" · ") || "—")}<br>
    प्रकाशित: ${fmtDateLine(p.date)}${p.verified && p.verified !== p.date ? ` · आख़िरी जाँच: ${fmtDateLine(p.verified)}` : ""}<br>
    नियम बाद में बदल सकते हैं — ऊपर दिया स्रोत खोलकर ताज़ा स्थिति देख लीजिए।</p>
    ${tags ? `<div class="tagrow">${tags}</div>` : ""}
    <div class="postfoot">
      <a class="btn" href="${esc(waShare(p.title, url))}" target="_blank" rel="noopener">WhatsApp पर भेजें</a>
      <a class="btn" href="/">और पोस्ट पढ़ें</a>
    </div>
  </article>
  ${others.length ? `<div class="more"><div class="listhead">इसे भी पढ़ें</div>${others.map(entryHTML).join("\n")}</div>` : ""}
</main>
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
  desc: "सीधा मतलब एक सूचना डेस्क है — घोटाले, बैंकिंग अधिकार और उपभोक्ता नियम सीधी भाषा में, हर बात के स्रोत के साथ।",
  body: `## यह डेस्क क्या करता है

रोज़ नए नियम आते हैं, नए घोटाले आते हैं। ज़्यादातर लोगों तक वे या तो पहुँचते ही नहीं, या इतनी भारी भाषा में पहुँचते हैं कि काम के नहीं रहते। यह डेस्क वही दूरी पाटता है — **नियम और चेतावनियाँ, सीधी भाषा में, हर बात के स्रोत के साथ।**

हम पाँच विषयों पर लिखते हैं:

- **साइबर स्कैम** — कैसे होता है, और बचने का असली तरीका क्या है
- **बैंकिंग / RBI** — आपके खाते पर आपके अधिकार
- **उपभोक्ता अधिकार** — सामान या सेवा खराब निकले तो
- **बीमा / IRDAI** — पॉलिसी से जुड़े नियम
- **EPFO / सैलरी** — नौकरीपेशा लोगों के अधिकार

## यह डेस्क क्या नहीं करता

- **डर नहीं बेचता।** घबराहट फैलाकर क्लिक बटोरना आसान है, पर उससे किसी का बचाव नहीं होता।
- **सलाहकार नहीं है।** यहाँ जो है वह सामान्य जानकारी है — कानूनी या वित्तीय सलाह नहीं। अपने मामले में आधिकारिक स्रोत या पेशेवर से पुष्टि कीजिए।
- **कुछ बेचता नहीं।** कोई विज्ञापन नहीं, कोई प्रायोजित पोस्ट नहीं, किसी बैंक या बीमा कंपनी का कोई रेफरल लिंक नहीं।

## नाम क्यों नहीं

यह डेस्क बिना नाम के चलता है, और यह जान-बूझकर है। मक़सद यह है कि आप बात को उसके **स्रोत** से परखें, लिखने वाले के नाम या पद से नहीं। इसीलिए हर पोस्ट के नीचे सरकारी लिंक रहता है — ताकि आप हम पर भरोसा किए बिना भी खुद जाँच सकें।

यहाँ किसी संस्था की अंदरूनी जानकारी नहीं आती। जो कुछ लिखा जाता है, वह सार्वजनिक रूप से उपलब्ध आधिकारिक दस्तावेज़ों से आता है। पूरा तरीका [स्रोत नीति](/source-policy/) में दर्ज है।

## कुछ कहना हो

WhatsApp Channel और X के लिंक नीचे फ़ुटर में हैं। कोई तथ्य गलत लगे तो ज़रूर बताइए — सुधार की नीति भी स्रोत नीति वाले पन्ने पर लिखी है।`,
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
- बताने के लिए WhatsApp Channel या X — दोनों के लिंक नीचे फ़ुटर में हैं

भरोसा इसी से बनता है कि गलती मानी जाए, छुपाई न जाए।`,
};

const PAGES = [ABOUT, SOURCE_POLICY];

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
    a: "हाँ, **फ्री-लुक अवधि** में। IRDAI के मास्टर सर्कुलर के बाद यह अवधि सभी पॉलिसियों के लिए **30 दिन** है। इस दौरान पॉलिसी लौटाकर प्रीमियम वापस लिया जा सकता है (कुछ कटौतियों के साथ)। [विस्तार से](/p/free-look-30-din/)।",
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
    q: "यह डेस्क कौन चलाता है?",
    a: "यह डेस्क बिना नाम के चलता है — ताकि आप बात को उसके **स्रोत** से परखें, लिखने वाले के नाम से नहीं। इसीलिए हर पोस्ट के नीचे सरकारी लिंक रहता है। वजह और तरीका [हमारे बारे में](/about/) और [स्रोत नीति](/source-policy/) में लिखा है।",
  },
  {
    q: "मेरा सवाल यहाँ नहीं है — कहाँ पूछूँ?",
    a: "WhatsApp Channel या X पर भेजिए (लिंक नीचे फ़ुटर में हैं)। जो सवाल बार-बार आते हैं, वे इसी पन्ने पर स्रोत के साथ जोड़ दिए जाते हैं। ध्यान रहे — यहाँ सामान्य जानकारी मिलती है, किसी एक केस की कानूनी या वित्तीय सलाह नहीं।",
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
      <div class="ans">${inline(esc(f.a))}</div>
    </details>`
  ).join("\n");

  const ask = SITE.whatsapp
    ? `<a class="asklink" href="${esc(SITE.whatsapp)}" target="_blank" rel="noopener"><b>अपना सवाल भेजिए</b> — WhatsApp Channel पर। बार-बार आने वाले सवाल यहाँ स्रोत के साथ जुड़ते रहते हैं।</a>`
    : "";

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

  fs.rmSync(path.join(__dirname, "dist"), { recursive: true, force: true });

  write("index.html", renderIndex(posts));
  write("404.html", render404());
  posts.forEach((p) => write(path.join("p", p.id, "index.html"), renderPost(p, posts)));
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
