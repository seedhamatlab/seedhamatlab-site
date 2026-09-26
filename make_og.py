from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json, base64, io
root=Path(__file__).parent
posts=json.loads((root/'data/posts.json').read_text())['posts']
# DejaVu me Devanagari nahi hai — isliye har post ka Latin/Hinglish copy yahan.
COPY={
'cibil-galat-entry':('Credit report mein galat entry?','30 din mein nipatara. Deri par Rs 100 roz.'),
'online-fraud-kya-kare':('Online fraud ho gaya?','Bank ko batayein. 1930 par report karein.'),
'digital-arrest':('Video call par arrest?','Call kaat dein. Alag se verify karein.'),
'golden-hour-3-din':('Paise kat gaye?','Bank ko turant batayein.'),
'free-look-30-din':('Life policy free-look?','Pehle policy documents check karein.'),
'epf-e-nomination':('EPF nominee check kiya?','Official portal par details dekhein.'),
'consumer-1915':('Product mein problem?','Proof rakhein. Official help route dekhein.'),
'fake-customer-care':('Search wala helpline?','Number official website se verify karein.'),
'electricity-kyc-apk':('Bijli KYC ka APK?','Message se aaya APK install na karein.'),
'upi-pin-refund':('Refund lene ko UPI PIN?','Paise receive karne ko PIN nahi chahiye.'),
'boss-whatsapp-payment':('Boss ne payment kaha?','Alag phone call par confirm karein.'),
'task-job-scam':('Task ke liye payment?','Aur paise bhejne se pehle ruk jaayein.'),
'trai-sim-threat':('TRAI se SIM band call?','Apne operator se seedha check karein.'),
'fake-echallan':('E-challan ka link aaya?','Official portal khud kholkar check karein.'),
'report-suspect':('Suspicious message?','Official reporting route use karein.'),
'screen-share-containment':('Screen share kiya tha?','Access band karein. Bank ko batayein.'),
'sim-connections-check':('Aapke naam par unknown SIM?','Sanchar Saathi par khud check karein.'),
}
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
brand_logo=Image.open(root/'assets/brand-logo.png').convert('RGBA').resize((64,64),Image.Resampling.LANCZOS)
F=lambda size,heavy=False:ImageFont.truetype(bold if heavy else font,size)

# Site ke dark band se mel khaate rang.
THEME={
 'info':  dict(bg=(14,17,22),  deep=(18,40,44),  accent=(233,185,73),  pill=(26,33,41), rule=(46,55,64)),
 'right': dict(bg=(14,17,22),  deep=(18,48,44),  accent=(233,185,73),  pill=(26,36,41), rule=(46,58,64)),
 'alert': dict(bg=(20,14,13),  deep=(58,22,17),  accent=(240,160,140), pill=(38,24,22), rule=(70,44,40)),
}
LABEL={'scam':'SCAM CHECK','bank':'BANKING SAFETY','insurance':'INSURANCE','consumer':'CONSUMER HELP','epfo':'EPF SELF-CHECK'}
WHITE=(244,245,242); MUTED=(152,163,174)

def fit(draw,s,xmax,size=62,floor=32):
 while draw.textbbox((0,0),s,font=F(size,True))[2]>xmax and size>floor: size-=2
 return F(size,True)

out={}
for p in posts:
 key=p['id']; title,action=COPY[key]
 t=THEME.get(p.get('severity','info'),THEME['info'])
 im=Image.new('RGB',(1200,630),t['bg']); d=ImageDraw.Draw(im)

 # site ke card jaisa bada halka ring, upar-daayein se bahar nikalta hua
 d.ellipse((905,-175,1505,425),fill=t['deep'])
 d.ellipse((933,-147,1477,397),fill=t['bg'])

 im.paste(brand_logo,(80,66),brand_logo)
 d.text((162,72),'SEEDHA MATLAB',font=F(25,True),fill=WHITE)
 d.text((163,105),'VERIFIED HELP  /  SOURCE LINKED',font=F(14,True),fill=t['accent'])

 lbl=LABEL.get(p['cat'],'SAFETY')
 lw=d.textbbox((0,0),lbl,font=F(17,True))[2]
 d.rounded_rectangle((80,180,80+lw+44,224),radius=22,fill=t['pill'],outline=t['rule'],width=1)
 d.text((102,192),lbl,font=F(17,True),fill=t['accent'])

 d.text((80,266),title,font=fit(d,title,1000),fill=WHITE)

 d.rounded_rectangle((80,392,1120,470),radius=20,fill=t['pill'])
 d.text((108,410),action,font=fit(d,action,984,30,22),fill=WHITE)

 source=(p.get('sources') or [{}])[0].get('label','Official source').split(' — ')[0]
 source=' '.join(source.split())
 if len(source)>55: source=source[:52]+'...'
 d.line((80,506,1120,506),fill=t['rule'],width=2)
 d.text((80,528),'Source: '+source,font=F(17),fill=MUTED)
 d.text((80,557),'Checked '+p.get('verified',p['date'])+'   |   seedhamatlab.com',font=F(15),fill=MUTED)

 buff=io.BytesIO(); im.quantize(colors=48,dither=Image.Dither.NONE).save(buff,'PNG',optimize=True)
 out[key]=base64.b64encode(buff.getvalue()).decode('ascii')

print('cards',len(out),'png bytes',sum(len(base64.b64decode(x)) for x in out.values()))
(root/'data/post-og.json').write_text(json.dumps(out,separators=(',',':')))
(root/'og-preview.png').write_bytes(base64.b64decode(out['upi-pin-refund']))
(root/'og-preview-alert.png').write_bytes(base64.b64decode(out['online-fraud-kya-kare']))
