# seedhamatlab.com

सीधा मतलब — स्रोत-सहित सूचना डेस्क। Static site, koi framework nahi, koi dependency nahi.

## Structure

```
data/posts.json     ← saara content yahin hai (CMS isi file ko edit karta hai)
build.js            ← JSON padhkar HTML pages banata hai
.pages.yml          ← Pages CMS ka form config
assets/og.png       ← WhatsApp/X preview image
dist/               ← build ka output (ye git me nahi jaata)
```

## Build

```bash
node build.js        # dist/ me poori site ban jaati hai
```

Node 18+ chahiye. Koi `npm install` nahi.

## Cloudflare Pages settings

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `node build.js` |
| Build output directory | `dist` |

`data/posts.json` me koi bhi commit hone par site apne aap dobara ban jaati hai.

## Post ka format

`data/posts.json` → `posts[]` me har item:

| Field | Matlab |
|---|---|
| `id` | URL ka naam — `/p/<id>/`. Angrezi akshar, ank, dash. Ek baar bana diya to badlein nahi. |
| `title` | Shirshak |
| `cat` | `scam` \| `bank` \| `consumer` \| `insurance` \| `epfo` |
| `date` | `YYYY-MM-DD` |
| `severity` | `info` \| `right` \| `alert` |
| `pinned` | `true` sirf ek post par |
| `summary` | 2–3 line — Google aur WhatsApp preview me yahi dikhta hai |
| `body` | `## upshirshak`, `- bullet`, `**mota**`, `[link](https://...)` |
| `tags` | Shabdon ki list |
| `sources` | `{ "label": "...", "url": "https://..." }` ki list |

## Site ki settings badalni ho

`build.js` ke sabse upar `SITE` object me — domain, Instagram/X ke link, aur WhatsApp Channel ka link (`whatsapp: ""` abhi khaali hai).

## Agar Pages CMS me dropdown khaali dikhe

`.pages.yml` me `options:` ke neeche se `values:` line hataakar list ko seedhe `options:` ke neeche kar dein — Pages CMS ke version ke hisaab se dono me se ek chalta hai.
