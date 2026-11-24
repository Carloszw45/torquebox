"""Photographic TorqueBox collection. QIFOR's landing page is outside this renderer."""
from pathlib import Path
from html import escape as e
from urllib.parse import quote
import json

ROOT=Path(__file__).resolve().parents[1]
PRODUCTS=json.loads((ROOT/'data/catalog-products.json').read_text())
BY_SLUG={p['slug']:p for p in PRODUCTS}
CATS={'wash':'Wash & foam','dry':'Drying','finish':'Paint & protection','interior':'Interior','glass':'Glass care','wheels':'Wheels & tires'}

def icon(name,size=22):
    paths={'left':'<path d="m14 5-7 7 7 7"/>','right':'<path d="m10 5 7 7-7 7"/>','search':'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>','bag':'<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>','check':'<path d="m5 12 4 4L19 6"/>','plus':'<path d="M12 5v14M5 12h14"/>','menu':'<path d="M4 7h16M4 12h16M4 17h16"/>','close':'<path d="m5 5 14 14M19 5 5 19"/>'}
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]}</svg>'

def head(title,desc,path,prefix='',page=''):
    return f'''<!doctype html>
<html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)} | TORQUEBOX</title><meta name="description" content="{e(desc)}"><meta name="theme-color" content="#161719"><link rel="canonical" href="https://torque-box.com/{path}">
<meta property="og:title" content="{e(title)} | TORQUEBOX"><meta property="og:description" content="{e(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="https://torque-box.com/{path}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{prefix}assets/catalog-v3.css?v=20261124-photo-1"><script defer src="{prefix}assets/catalog-v3.js?v=20261124-photo-1"></script></head><body class="photo-store {page}">'''

def header(prefix=''):
    return f'''<a class="skip-link" href="#main">Skip to content</a><div class="announcement"><span>CAR CARE. LESS EFFORT.</span><span>Discover the next chapter of TorqueBox.</span></div>
<header class="site-header"><div class="shell header-inner"><button type="button" class="menu-toggle" aria-expanded="false" aria-controls="main-navigation" aria-label="Open menu">{icon('menu')}</button><a class="brand" href="{prefix}shop.html" aria-label="TorqueBox collection"><img src="{prefix}assets/branding/torquebox-wordmark.webp" alt="TORQUEBOX" width="1100" height="161"></a><nav id="main-navigation" aria-label="Main navigation"><a href="{prefix}shop.html#collection">The collection</a><a href="{prefix}shop.html?category=wash#collection">Wash</a><a href="{prefix}shop.html?category=dry#collection">Dry</a><a href="{prefix}shop.html?category=finish#collection">Protect</a><a href="{prefix}support.html">Support</a></nav><div class="header-actions"><a href="{prefix}shop.html#search" aria-label="Search products">{icon('search')}</a><a href="{prefix}index.html#purchase-section" aria-label="Shop QIFOR">{icon('bag')}</a></div></div></header>'''

def footer(prefix=''):
    return f'''<footer class="site-footer"><div class="shell"><div class="footer-top"><div><img class="footer-brand" src="{prefix}assets/branding/torquebox-wordmark.webp" alt="TORQUEBOX" width="1100" height="161"><p>For the car you care about.<br>And the details that make it yours.</p></div><div><h2>Explore</h2><a href="{prefix}shop.html">The collection</a><a href="{prefix}shop.html#routine">Your care routine</a><a href="{prefix}index.html#purchase-section">QIFOR Wind Shield Pro</a></div><div><h2>Here to help</h2><a href="{prefix}support.html">Contact TorqueBox</a><a href="{prefix}shipping.html">Shipping information</a><a href="{prefix}returns.html">Returns & refunds</a></div><div><h2>Talk to us</h2><a href="mailto:suporte@torque-box.com">suporte@torque-box.com</a><p>Questions about a product?<br>We will help you find the right information.</p></div></div><div class="footer-bottom"><span>© 2026 TORQUEBOX</span><div><a href="{prefix}privacy.html">Privacy</a><a href="{prefix}terms.html">Terms</a></div><span>New collection previews. QIFOR available now.</span></div></div></footer>'''

def pack(p):
    return next(x for x in p['gallery'] if x['kind']=='pack')

def card(p,prefix=''):
    url=prefix+'products/'+p['slug']+'.html';still=pack(p);action=p['gallery'][0]
    return f'''<article class="product-card" data-product-card data-category="{p['category']}" data-search="{e(p['title']+' '+p['promise']+' '+p['surface']+' '+CATS[p['category']])}"><a href="{url}" class="card-image" tabindex="-1" aria-hidden="true"><img class="card-pack" src="{prefix}{still['src']}" alt="" width="800" height="800" loading="lazy" decoding="async"><img class="card-action" src="{prefix}{action['src']}" alt="" width="800" height="800" loading="lazy" decoding="async"><span class="card-badge">Coming soon</span><span class="card-gallery-label">6 photos</span></a><div class="card-copy"><span class="eyebrow">{CATS[p['category']]}</span><h3><a href="{url}">{e(p['title'])}</a></h3><p>{e(p['promise'])}</p><a class="text-link" href="{url}" aria-label="Explore {e(p['title'])}">Explore product</a></div></article>'''

def photo_guide(p):
    # Photos show the product or its application; none are vector illustrations.
    g=p['gallery'];byfile={Path(x['src']).name:x for x in g}
    def gen(key,alt):return {'src':'assets/photography/application-'+key+'.webp','kind':'application','alt':alt,'origin':'generated'}
    defaults=[pack(p),g[0],next((x for x in reversed(g)if x['kind']=='application'),g[0])]
    custom={
      'drying-towel':lambda: [gen('sealant','Thoroughly rinsing a clean car before drying'),next(x for x in g if 'source-6' in x['src']),next(x for x in g if 'source-4' in x['src'])],
      'pressure-washer-gun':lambda: [pack(p),next(x for x in g if 'source-12' in x['src']),g[0]],
      'foam-cannon':lambda: [gen('mix','Measuring a compatible car-care concentrate before use'),g[0],gen('sealant','Rinsing the car thoroughly before the foam can dry')],
      'air-blower':lambda: [pack(p),next(x for x in g if 'blower-badge' in x['src']),next(x for x in BY_SLUG['drying-towel']['gallery']if 'source-7' in x['src'])],
      'v-floc-shampoo':lambda: [gen('mix','Measuring wash concentrate into water'),next(x for x in g if 'source-4' in x['src']),gen('sealant','A car receiving a final rinse')],
      'v-mol-prewash':lambda: [gen('mix','Preparing a measured wash solution'),next(x for x in g if 'source-5' in x['src']),next(x for x in g if 'source-6' in x['src'])],
      'sintra-interior-cleaner':lambda: [pack(p),next(x for x in g if 'source-4' in x['src']),gen('interior','Wiping the interior with a microfiber cloth')],
      'glazy-glass-cleaner':lambda: [pack(p),gen('glass','Cleaning the car side glass with a microfiber cloth'),next(x for x in g if 'source-5' in x['src'])],
      'hydrox-fast-sealant':lambda: [gen('sealant','Rinsing clean wet paintwork'),next(x for x in g if x['src'].endswith('-2.webp')),gen('sealant','Immediate rinse during the protective finishing stage')],
      'blend-spray-wax':lambda: [pack(p),next(x for x in g if 'source-4' in x['src']),gen('buff','Buffing clean paint with a microfiber cloth')],
      'delet-tire-cleaner':lambda: [pack(p),gen('tire-clean','Brush cleaning a tire sidewall'),next(x for x in g if 'source-6' in x['src'])],
      'vexus-wheel-cleaner':lambda: [gen('wheel-spray','Applying cleaner to a cool wheel'),gen('wheel-brush','Cleaning wheel spokes with a detailing brush'),gen('engine','Controlled cleaning in a cool engine bay')],
      'shiny-tire-dressing':lambda: [gen('tire-clean','Cleaning the sidewall before tire dressing'),gen('tire','Applying tire dressing with a foam applicator'),next(x for x in g if 'source-4' in x['src'])],
      'izer-iron-remover':lambda: [pack(p),next(x for x in g if x['src'].endswith('-2.webp')),next(x for x in g if 'source-5' in x['src'])],
      'impact-all-purpose-cleaner':lambda: [pack(p),next(x for x in g if x['src'].endswith('-2.webp')),gen('fabric','Wet extraction of carpet after cleaning')],
    }
    images=custom[p['slug']]() if p['slug'] in custom else defaults
    return ''.join(f'''<li class="photo-step"><figure><img src="../{im['src']}" alt="{e(im['alt'])}" width="900" height="700" loading="lazy" decoding="async"><span class="step-count">0{i+1}</span></figure><h3>{e(s['title'])}</h3><p>{e(s['text'])}</p></li>''' for i,(s,im) in enumerate(zip(p['steps'],images)))

def reviews(p):
    subject=quote('Product feedback: '+p['title']);email=f'mailto:suporte@torque-box.com?subject={subject}'
    if not p['reviews']:
        return f'<section class="feedback-compact" id="reviews"><div><span class="eyebrow">OWNER FEEDBACK</span><h2>Your experience matters.</h2><p>No TorqueBox reviews for this upcoming product yet.</p></div><a class="text-link" href="{email}">Share your experience</a></section>'
    items=[]
    for r in p['reviews']:
        stars=f'<span class="stars" aria-label="{r["rating"]} out of 5 stars">'+('★'*r['rating'])+'</span>'if r.get('rating')else'<span class="quote-label">Owner perspective</span>'
        items.append(f'<article class="owner-quote">{stars}<blockquote>“{e(r["quote"])}”</blockquote><div class="quote-person"><span class="avatar" aria-hidden="true">{e(r["initials"])}</span><div><strong>{e(r["name"])}</strong><span>{e(r["source"])}</span></div></div><a class="text-link" href="{e(r["url"])}#judgeme_product_reviews" target="_blank" rel="noopener noreferrer">Read the original review</a></article>')
    return f'<section class="owner-section section" id="reviews"><div class="section-heading"><div><span class="eyebrow">REFERENCE PRODUCT FEEDBACK</span><h2>From people who have used it.</h2></div><a class="text-link" href="{email}">Share your experience</a></div><div class="owner-quotes">'+''.join(items)+'</div><p class="fine-print">Public excerpts about the reference model, not TorqueBox orders. Initials are used because the sources did not provide profile photos. Full reviews and other ratings are available at the source.</p></section>'

def product_page(p):
    g=p['gallery'];first=g[0];still=pack(p)
    thumbs=''.join(f'<button class="photo-thumb {"is-active"if i==0 else ""}" type="button" aria-label="View photo {i+1} of 6: {e(im["alt"])}" aria-pressed="{str(i==0).lower()}" data-photo-index="{i}" data-src="../{im["src"]}" data-alt="{e(im["alt"])}" data-kind="{im["kind"]}" data-origin="{im["origin"]}"><img src="../{im["src"]}" alt="" width="100" height="100" loading="{"eager"if i<2 else "lazy"}" decoding="async"></button>'for i,im in enumerate(g))
    reason_list=''.join(f'<li>{icon("check",18)}<span>{e(r["text"])}</span></li>'for r in p['reasons'])
    specs=''.join(f'<tr><th scope="row">{e(k)}</th><td>{e(v)}</td></tr>'for k,v in p['specs'])
    faq=''.join(f'<details><summary>{e(q)}{icon("plus",18)}</summary><p>{e(a)}</p></details>'for q,a in p['faq'])
    related=''.join(card(BY_SLUG[s],'../')for s in p['related'])
    extra=next((im for im in g[1:]if im['kind']=='application'and im['src']!=first['src']),first)
    schema={'@context':'https://schema.org','@type':'Product','name':p['title'],'description':p['how'],'image':['https://torque-box.com/'+x['src']for x in g],'url':'https://torque-box.com/products/'+p['slug']}
    return head(p['title'],p['promise'],'products/'+p['slug'],'../','product-page')+header('../')+f'''
<main id="main"><div class="shell"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="../shop.html">Collection</a><span>/</span><a href="../shop.html?category={p['category']}#collection">{CATS[p['category']]}</a><span>/</span><span>{e(p['title'])}</span></nav>
<section class="product-hero"><div class="product-gallery" data-gallery><div class="photo-stage" tabindex="0" role="region" aria-label="{e(p['title'])} photo carousel"><img class="main-photo" data-main-photo src="../{first['src']}" alt="{e(first['alt'])}" width="1100" height="1100" fetchpriority="high"><span class="gallery-count" data-photo-count aria-live="polite">01 / 06</span><span class="gallery-origin" data-photo-origin>{'Illustrative application'if first['origin']=='generated'else'Application reference'}</span><div class="pack-inset" data-pack-inset><img src="../{still['src']}" alt="{e(p['title'])} product packaging" width="150" height="190"></div><div class="photo-arrows"><button type="button" aria-label="Previous photo" data-photo-prev>{icon('left')}</button><button type="button" aria-label="Next photo" data-photo-next>{icon('right')}</button></div></div><div class="photo-thumbs" role="group" aria-label="Six product photographs">{thumbs}</div><p class="gallery-help">Explore the product and its application. Swipe on mobile or use the arrows.</p></div>
<div class="product-intro"><div class="intro-tags"><span class="eyebrow">{CATS[p['category']]}</span><span class="launch-tag">COMING SOON</span></div><p class="product-name">{e(p['title'])}</p><h1>{e(p['headline'])}</h1><p class="product-description">{e(p['how'])}</p><ul class="intro-benefits">{reason_list}</ul><div class="intro-actions"><a class="button primary" href="#how-to-use">See it in your routine</a><a class="button outline" href="#details">Product details</a></div><div class="availability-note"><strong>The next chapter of TorqueBox.</strong><p>This product is a preview. Final model, price and delivery details will be confirmed before ordering opens.</p></div><div class="quick-links"><a href="../support.html">Ask about this product</a><a href="../shop.html">Explore the collection</a></div></div></section>
<nav class="page-tabs" aria-label="Product sections"><a href="#in-action">In action</a><a href="#how-to-use">How to use</a><a href="#fit">Where it fits</a><a href="#details">Details</a><a href="#reviews">Owner feedback</a></nav>
<section class="in-action section" id="in-action"><div class="action-copy"><span class="eyebrow">THE DETAILS MAKE THE DIFFERENCE</span><h2>{e(p['promise'])}</h2><p class="lead">{e(p['problem'])}</p><p>{e(p['payoff'])}</p><div class="action-facts"><div><span>WHEN TO USE IT</span><strong>{e(p['stage'])}</strong></div><div><span>MADE FOR</span><strong>{e(p['surface'])}</strong></div></div></div><figure class="action-image"><img src="../{extra['src']}" alt="{e(extra['alt'])}" width="1100" height="1100" loading="lazy" decoding="async"><figcaption>Application reference</figcaption></figure></section>
<section class="how-section section" id="how-to-use"><div class="section-heading"><div><span class="eyebrow">KNOW THE ROUTINE</span><h2>Good care.<br>Clearly shown.</h2></div><p>See the preparation, application and finishing steps for this reference product.</p></div><ol class="photo-steps">{photo_guide(p)}</ol><div class="method-note"><span>THE DETAIL THAT MATTERS</span><p>{e(p['tip'])}</p></div><p class="fine-print">Product photography is combined with illustrative application scenes, including AI-generated images. Images explain the routine and do not represent customer results. Follow the supplied label and equipment instructions.</p></section>
<section class="fit-section" id="fit"><div><span class="eyebrow">THE RIGHT PRODUCT. THE RIGHT PLACE.</span><h2>Choose with confidence.</h2></div><div><span class="fit-label">USE IT FOR</span><p>{e(p['suited'])}</p></div><div><span class="fit-label">KEEP IN MIND</span><p>{e(p['avoid'])}</p></div></section>
<section class="detail-section section" id="details"><div><span class="eyebrow">GET TO KNOW IT</span><h2>The finer details.</h2><table class="spec-table"><tbody>{specs}</tbody></table><a class="text-link source-link" href="{e(p['primary'])}" target="_blank" rel="noopener noreferrer">Reference product instructions</a></div><div class="faq"><span class="eyebrow">BEFORE YOU START</span><h2>A little more clarity.</h2>{faq}<details><summary>When can I order this product?{icon('plus',18)}</summary><p>This upcoming product does not have a confirmed price or launch date yet. TorqueBox will confirm the final item and delivery details before opening orders.</p></details></div></section>
{reviews(p)}
<section class="section related-section"><div class="section-heading"><div><span class="eyebrow">MAKE YOUR ROUTINE YOUR OWN</span><h2>Good together.</h2></div><a class="text-link" href="../shop.html">Explore all products</a></div><div class="product-grid related-grid">{related}</div></section></div>
<section class="support-band"><div class="shell"><div><span class="eyebrow">A QUESTION BEFORE YOU CHOOSE?</span><h2>We are here to help.</h2></div><a class="button light" href="../support.html">Contact TorqueBox</a></div></section></main>{footer('../')}<script type="application/ld+json">{json.dumps(schema)}</script></body></html>'''

def catalog_page():
    filters='<button type="button" data-category-filter="all" aria-pressed="true" class="is-active">All products</button>'+''.join(f'<button type="button" data-category-filter="{k}" aria-pressed="false">{v}</button>'for k,v in CATS.items())
    qifor='''<article class="product-card" data-product-card data-category="glass" data-search="QIFOR windshield washer fluid glass cleaner concentrate"><a class="card-image" href="index.html#purchase-section" tabindex="-1" aria-hidden="true"><img class="card-pack" src="assets/images/qifor-wind-shield-pro.jpg" alt="" width="800" height="800" loading="lazy"><span class="card-badge available">Available now</span></a><div class="card-copy"><span class="eyebrow">Glass care</span><h3><a href="index.html#purchase-section">QIFOR Wind Shield Pro</a></h3><p>Help clear oily road film from your windshield.</p><a class="text-link" href="index.html#purchase-section">Shop QIFOR</a></div></article>'''
    cards=''.join(card(p)for p in PRODUCTS)+qifor
    edits=[('wash','START WITH THE WASH.','Foam, rinse and clean with purpose.','assets/photography/application-mix.webp','Preparing a measured car wash solution'),('dry','FINISH EVERY DROP.','A towel for panels. Air for the details.',BY_SLUG['drying-towel']['gallery'][0]['src'],'Drying a clean wet car with microfiber'),('finish','GIVE CLEAN PAINT ITS FINISH.','Explore the final touch in your routine.','assets/photography/application-buff.webp','Buffing clean paint with microfiber')]
    edit_cards=''.join(f'<a class="editorial-card" href="?category={key}#collection"><img src="{src}" alt="{e(alt)}" width="1100" height="1100" loading="lazy"><div><span class="eyebrow">{CATS[key]}</span><h3>{title}</h3><p>{desc}</p><span class="editorial-link">Explore the range</span></div></a>'for key,title,desc,src,alt in edits)
    more=[('interior','CARE FOR THE CABIN.','assets/photography/application-interior.webp'),('glass','LET THE VIEW SHINE.','assets/photography/application-glass.webp'),('wheels','DOWN TO THE LAST DETAIL.','assets/photography/application-tire.webp')]
    more_cards=''.join(f'<a class="more-care-card" href="?category={key}#collection"><img src="{src}" alt="{CATS[key]} application scene" width="1100" height="1100" loading="lazy"><div><span class="eyebrow">{CATS[key]}</span><h3>{title}</h3><span>Explore {CATS[key].lower()}</span></div></a>'for key,title,src in more)
    return head('Car care. Less effort.','Discover TorqueBox car care through product photography, six-image galleries and clear application guides.','shop',page='collection-page')+header()+f'''
<main id="main"><section class="collection-hero"><img class="hero-photo" src="assets/photography/garage-hero.webp" alt="A freshly cared-for graphite sports car in a detailing garage" width="1536" height="1024" fetchpriority="high"><div class="hero-shade"></div><div class="shell hero-content"><span class="eyebrow">FOR THE CAR YOU CARE ABOUT.</span><h1>CAR CARE.<br><em>LESS EFFORT.</em></h1><p>Find the tools and formulas for a routine you can see, understand and make your own.</p><div class="hero-actions"><a class="button primary" href="#collection">Explore the collection</a><a class="hero-secondary" href="#routine">Find your routine</a></div><div class="hero-footnote"><span>WASH</span><i></i><span>DRY</span><i></i><span>FINISH</span></div></div><span class="hero-image-credit">Illustrative garage scene</span></section>
<section class="trust-strip"><div class="shell"><span>Product photos & application galleries</span><span>Clear directions for every product</span><a href="support.html">Support from TorqueBox</a></div></section>
<section class="shell section editorial-section" id="routine"><div class="section-heading"><div><span class="eyebrow">THE DETAILS MAKE THE DIFFERENCE.</span><h2>Your car.<br>Your kind of care.</h2></div><p>Start with the job. Get to know the product.<br>See exactly where it fits in your routine.</p></div><div class="editorial-grid">{edit_cards}</div></section>
<section class="collection-section" id="collection"><div class="shell"><div class="section-heading"><div><span class="eyebrow">THE TORQUEBOX COLLECTION</span><h2>Meet your next essentials.</h2></div><p>15 upcoming additions.<br>QIFOR is available in the store today.</p></div><div class="collection-controls"><div class="category-filters" role="group" aria-label="Filter by category">{filters}</div><form role="search" id="search"><label class="sr-only" for="product-search">Search products</label><input id="product-search" type="search" name="q" placeholder="Find your car care" autocomplete="off"><button type="submit" aria-label="Search collection">{icon('search')}</button></form></div><p class="result-count" id="result-count" aria-live="polite" role="status">16 products</p><div class="product-grid" id="product-grid">{cards}</div><div class="empty-results" id="empty-results" hidden><h3>No matching products.</h3><p>Try another product name or category.</p><button type="button" class="button dark" id="reset-search">Show all products</button></div><p class="fine-print">New collection products are previews. Final models, prices and delivery details will be confirmed before ordering opens.</p></div></section>
<section class="shell section more-care-section"><div class="section-heading"><div><span class="eyebrow">CARE GOES BEYOND THE PAINT.</span><h2>Every surface.<br>Every finishing touch.</h2></div></div><div class="more-care-grid">{more_cards}</div></section>
<section class="care-story"><img src="assets/photography/application-buff.webp" alt="A final microfiber wipe on glossy clean paint" width="1100" height="1100" loading="lazy"><div><span class="eyebrow">LESS GUESSWORK. MORE CARE.</span><h2>KNOW THE PRODUCT.<br>ENJOY THE PROCESS.</h2><p>Every product page brings together six photographic views, the application method and the details you need before choosing.</p><a class="button light" href="products/drying-towel.html">Explore the drying towel</a></div></section>
<section class="support-band"><div class="shell"><div><span class="eyebrow">ALREADY IN THE TORQUEBOX STORE</span><h2>Start with a clearer view.</h2><p>Meet QIFOR Wind Shield Pro, our windshield-care essential.</p></div><a class="button primary" href="index.html#purchase-section">Shop QIFOR</a></div></section></main>{footer()}</body></html>'''

def main():
    assert len(PRODUCTS)==15
    for p in PRODUCTS:
        assert len(p['gallery'])>=6 and len({x['src']for x in p['gallery']})>=6
        assert all((ROOT/x['src']).is_file()for x in p['gallery'])
        (ROOT/'products'/(p['slug']+'.html')).write_text(product_page(p))
    (ROOT/'shop.html').write_text(catalog_page())
    print('Rendered 15 photographic product pages with six photos each, plus the collection. QIFOR was not touched.')

if __name__=='__main__':main()
