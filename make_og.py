from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json, base64, io, textwrap
root=Path(__file__).parent
posts=json.loads((root/'data/posts.json').read_text())['posts']
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
brand_logo=Image.open(root/'assets/brand-logo.png').convert('RGBA').resize((70,70),Image.Resampling.LANCZOS)
F=lambda size,heavy=False:ImageFont.truetype(bold if heavy else font,size)
colors={'scam':(22,100,184),'bank':(49,85,167),'insurance':(91,74,154),'consumer':(30,116,155),'epfo':(15,104,127)}
def fit(draw,s,xmax,size=62):
 while draw.textbbox((0,0),s,font=F(size,True))[2]>xmax and size>32:size-=2
 return F(size,True)
out={}
for p in posts:
 key=p['id']; title,action=COPY[key]; bg=colors.get(p['cat'],colors['scam'])
 im=Image.new('RGB',(1200,630),(247,250,255));d=ImageDraw.Draw(im)
 d.rectangle((0,0,1200,22),fill=bg)
 d.rounded_rectangle((56,55,1144,574),radius=30,fill=(255,255,255),outline=(210,224,240),width=2)
 im.paste(brand_logo,(86,82),brand_logo)
 d.text((173,89),'SEEDHA MATLAB',font=F(26,True),fill=(24,52,83))
 d.text((175,122),'VERIFIED HELP',font=F(15,True),fill=bg)
 d.rounded_rectangle((87,181,320,224),radius=18,fill=(231,240,251))
 d.text((107,188),{'scam':'SCAM CHECK','bank':'BANKING SAFETY','insurance':'INSURANCE','consumer':'CONSUMER HELP','epfo':'EPF SELF-CHECK'}.get(p['cat'],'SAFETY'),font=F(18,True),fill=bg)
 d.text((87,260),title,font=fit(d,title,990),fill=(17,42,73))
 d.rounded_rectangle((86,377,1114,458),radius=17,fill=(234,246,248))
 d.text((112,393),action,font=fit(d,action,970,30),fill=(16,84,106))
 source=(p.get('sources') or [{}])[0].get('label','Official source').split(' — ')[0]
 source=' '.join(source.split())
 if len(source)>55:source=source[:52]+'...'
 d.line((87,487,1114,487),fill=(210,224,240),width=2)
 d.text((89,510),'Source: '+source,font=F(17),fill=(77,91,110))
 d.text((89,539),'Checked '+p.get('verified',p['date'])+'  |  seedhamatlab.com',font=F(15),fill=(93,108,127))
 buff=io.BytesIO();im.quantize(colors=32,dither=Image.Dither.NONE).save(buff,'PNG',optimize=True)
 out[key]=base64.b64encode(buff.getvalue()).decode('ascii')
print('cards',len(out),'png bytes',sum(len(base64.b64decode(x)) for x in out.values()))
(root/'data/post-og.json').write_text(json.dumps(out,separators=(',',':')))
(root/'og-preview.png').write_bytes(base64.b64decode(out['upi-pin-refund']))
