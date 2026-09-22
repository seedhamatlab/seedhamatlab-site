# seedhamatlab.com — शून्य से लाइव तक

कुल समय: लगभग 60–90 मिनट। तकनीकी जानकारी की ज़रूरत नहीं — सब कुछ ब्राउज़र से होगा, मोबाइल से भी।
कुल खर्च: सिर्फ़ domain, लगभग **₹900–1,200 साल भर का**। Hosting, CMS, SSL — सब मुफ़्त।

---

## पहले यह पढ़ लीजिए — पहचान अलग रखने के नियम

आप यह ब्रांड अपने नाम से अलग चलाते हैं। नीचे के हर कदम पर यही नियम लागू रहेगा:

1. इस काम के लिए **एक नया ईमेल** बनाइए — जैसे `seedhamatlab@proton.me` या नया Gmail। इसमें अपना असली नाम मत डालिए (Display name भी "Seedha Matlab" रखिए)।
2. GitHub, Cloudflare, Pages CMS — तीनों **उसी नए ईमेल** से बनाइए। अपने मौजूदा खातों से लॉगिन मत कीजिए।
3. Domain खरीदते समय **WHOIS privacy ज़रूर on रखिए** (Cloudflare और Porkbun दोनों में यह मुफ़्त और डिफ़ॉल्ट है)। इसके बिना आपका नाम-पता-फ़ोन दुनिया भर को दिखता है।
4. साइट पर कहीं भी अपना नाम, नियोक्ता, शाखा, पद या फ़ोटो नहीं। अभी की फ़ाइलों में कुछ भी ऐसा नहीं है।
5. पासवर्ड अलग रखिए, और तीनों खातों पर two-factor authentication चालू कर लीजिए।
6. जो तस्वीरें अपलोड करें, उनसे location metadata हटा दीजिए (WhatsApp से भेजी-मँगाई तस्वीर में यह अपने आप हट जाता है — यह सबसे आसान तरीका है)।

> भुगतान कार्ड से आपका नाम registrar के पास रहेगा — यह सामान्य है और सार्वजनिक नहीं होता। WHOIS privacy का काम यही है कि वह जानकारी सार्वजनिक directory में न जाए।

---

## चरण 1 — नया ईमेल (5 मिनट)

Proton Mail (proton.me) या Gmail — कोई भी। नाम: **Seedha Matlab**। यही ईमेल आगे हर जगह चलेगा।

---

## चरण 2 — GitHub पर फ़ाइलें रखिए (15 मिनट)

GitHub आपकी साइट की फ़ाइलों का घर है। यहाँ से hosting भी उठेगी और CMS भी।

1. **github.com** → Sign up → नए ईमेल से खाता बनाइए। Username ऐसा रखिए जिसमें आपका नाम न हो — जैसे `seedhamatlab`।
2. ऊपर दाईं ओर **+ → New repository**।
   - Repository name: `seedhamatlab`
   - **Public** चुनिए (Cloudflare Pages और Pages CMS का मुफ़्त plan इसी पर आसान रहता है)
   - बाक़ी सब वैसे ही छोड़कर **Create repository**।
3. अब फ़ाइलें चढ़ाइए। नए repository के पेज पर **uploading an existing file** लिंक दिखेगा — उस पर जाइए।
4. मैंने जो ZIP भेजा है उसे कंप्यूटर पर खोलिए (unzip कीजिए) और **अंदर की सारी फ़ाइलें और फ़ोल्डर** इस पेज पर खींचकर छोड़ दीजिए —
   `build.js`, `README.md`, `SETUP.md`, `.gitignore`, `.pages.yml`, और `data` व `assets` फ़ोल्डर।
5. नीचे **Commit changes** दबाइए।

> `.pages.yml` और `.gitignore` जैसे डॉट से शुरू होने वाले नाम कुछ कंप्यूटरों पर छिपे रहते हैं। Windows में Explorer → View → "Hidden items" चालू कीजिए; Mac में Finder में `Cmd + Shift + .` दबाइए।
>
> मोबाइल से कर रहे हैं तो GitHub की वेबसाइट पर "Add file → Create new file" से एक-एक फ़ाइल बनाकर सामग्री चिपकाई जा सकती है — पर कंप्यूटर से यह काम दस गुना आसान है। यह एक ही बार का काम है।

---

## चरण 3 — Domain खरीदिए (15 मिनट)

**Cloudflare** (सुझाव): dash.cloudflare.com → नए ईमेल से खाता → बाएँ मेन्यू में **Domain Registration → Register Domains** → `seedhamatlab.com` खोजिए → खरीदिए।
WHOIS privacy अपने आप on रहती है, अलग से पैसा नहीं। Domain और hosting एक ही जगह होने से DNS की कोई सेटिंग हाथ से नहीं करनी पड़ती — इसीलिए यह सुझाव है।

**विकल्प:** Porkbun (porkbun.com) — यहाँ भी WHOIS privacy मुफ़्त है।

दोनों के लिए international payment वाला कार्ड चाहिए। अगर ऐसा कार्ड न हो तो BigRock/GoDaddy India से UPI पर भी ख़रीद सकते हैं — पर वहाँ privacy अलग से लेनी पड़ती है, और उसे लेना ज़रूरी है।

> अगर Cloudflare के अलावा कहीं से लिया, तो बाद में Cloudflare में **Add a domain** करके वहाँ के दो nameservers अपने registrar में डालने होंगे। मुझे बता दीजिएगा, मैं उसी हिसाब से बता दूँगा।

---

## चरण 4 — साइट लाइव कीजिए (10 मिनट)

1. Cloudflare dashboard → बाएँ मेन्यू में **Compute (Workers & Pages)** → **Create** → **Pages** → **Connect to Git**।
2. GitHub से जोड़िए और `seedhamatlab` repository चुनिए।
3. Build settings में:
   - Framework preset: **None**
   - Build command: `node build.js`
   - Build output directory: `dist`
4. **Save and Deploy**। एक-दो मिनट में साइट `seedhamatlab.pages.dev` जैसे पते पर चालू हो जाएगी — खोलकर देख लीजिए।

---

## चरण 5 — अपना domain जोड़िए (5 मिनट)

उसी Pages project में → **Custom domains** → **Set up a domain** → `seedhamatlab.com` डालिए → confirm।
फिर दोबारा वही करके `www.seedhamatlab.com` भी जोड़ दीजिए।

Domain अगर Cloudflare से ही लिया है तो DNS अपने आप सेट हो जाएगा। HTTPS का ताला भी अपने आप लगता है — बस 5–15 मिनट लग सकते हैं।

---

## चरण 6 — लिखने का पैनल चालू कीजिए (10 मिनट)

1. **app.pagescms.org** खोलिए → **Sign in with GitHub**।
2. यह आपके `seedhamatlab` repository तक पहुँच माँगेगा — सिर्फ़ उसी एक repository को चुनिए, "All repositories" मत दीजिए।
3. अंदर जाते ही **पोस्ट** नाम का फ़ॉर्म दिखेगा — यह `.pages.yml` से बना है।
4. नया पोस्ट: सूची में **Add an item** → फ़ील्ड भरिए → **Save**।

Save दबाते ही GitHub में बदलाव जाता है, Cloudflare उसे देखकर साइट दोबारा बना देता है — लगभग **1–2 मिनट में** आपका पोस्ट seedhamatlab.com पर लाइव।

app.pagescms.org को फ़ोन की home screen पर add कर लीजिए — ऐप जैसा खुलेगा।

### भरते समय ध्यान

| फ़ील्ड | ध्यान |
|---|---|
| URL नाम (slug) | सिर्फ़ अंग्रेज़ी छोटे अक्षर, अंक, डैश — जैसे `upi-pin-scam`। **एक बार बनने के बाद बदलिए मत**, वरना पुराना लिंक टूट जाएगा। |
| सार | 2–3 लाइन। Google और WhatsApp में यही दिखता है — इसे सबसे ध्यान से लिखिए। |
| मुख्य लेख | `## उपशीर्षक`, `- बुलेट`, `**मोटा**`, `[नाम](https://लिंक)` |
| स्रोत | हर पोस्ट पर कम से कम एक सरकारी लिंक — यही आपके ब्रांड की पूरी बात है। |
| पिन | एक समय पर सिर्फ़ एक पोस्ट पर। |

---

## चरण 7 — Google में दिखने के लिए (10 मिनट)

1. **search.google.com/search-console** → नए ईमेल से लॉगिन → **Add property** → **URL prefix** → `https://seedhamatlab.com`
2. सत्यापन के लिए **HTML tag** वाला विकल्प चुनिए, जो `<meta name="google-site-verification" ...>` लाइन देगा — वह लाइन मुझे भेज दीजिए, मैं `build.js` में जोड़ देता हूँ।
3. सत्यापन के बाद → **Sitemaps** → `sitemap.xml` डालकर submit कीजिए।

Google को नए पेज पकड़ने में कुछ दिन से कुछ हफ़्ते लगते हैं। यह सामान्य है।

---

## रोज़ का काम, चरणों में

1. कोई नियम बदला या कोई नया स्कैम दिखा — **आधिकारिक स्रोत पहले** (RBI, IRDAI, EPFO, I4C, NCH)।
2. app.pagescms.org → Add an item → लिखिए → Save।
3. 1–2 मिनट बाद seedhamatlab.com पर लाइव।
4. वही लिंक Instagram, WhatsApp Channel और X पर — साइट आपका स्थायी घर है, बाकी सब रास्ते।

---

## आगे जो मैं जोड़ सकता हूँ, बताइएगा

- WhatsApp Channel का लिंक (अभी फ़ुटर में खाली है)
- "हमारे बारे में" और "स्रोत नीति" के अलग पेज
- हर पोस्ट के नीचे WhatsApp पर भेजने का बटन
- RSS feed, ताकि लोग बिना किसी ऐप के जुड़ सकें
- Google Analytics की जगह privacy-friendly counter
