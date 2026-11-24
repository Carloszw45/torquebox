"""Render the upcoming catalog. This script never reads or writes QIFOR's index.html."""
from pathlib import Path
from html import escape as esc
from urllib.parse import quote
import json

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = json.loads((ROOT / 'data/catalog-products.json').read_text())
CATEGORIES = {'wash': 'Wash & foam', 'dry': 'Drying', 'finish': 'Paint & protection', 'interior': 'Interior', 'glass': 'Glass care', 'wheels': 'Wheels & tires'}
BY_SLUG = {p['slug']: p for p in PRODUCTS}


def icon(name, size=24):
    paths = {
        'drop': '<path d="M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
        'spark': '<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>',
        'layers': '<path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5"/>',
        'check': '<path d="m5 12 4 4L19 6"/>',
        'bag': '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
        'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4.2 4.2l2.2 2.2m11.2 11.2 2.2 2.2M4.2 19.8l2.2-2.2M17.6 6.4l2.2-2.2"/>',
        'cloth': '<path d="m5 3 15 4-4 14L2 17 5 3Z"/><path d="m8 7 8 2m-9 2 8 2m-9 2 8 2"/>',
        'chat': '<path d="M21 11a8 8 0 0 1-8 8H8l-6 3 2-6a8 8 0 0 1-1-5 9 9 0 1 1 18 0Z"/><path d="M7 10h10M7 14h6"/>',
        'search': '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    }
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths.get(name, paths["spark"])}</svg>'


def href(p, prefix=''):
    return prefix + 'products/' + p['slug'] + '.html'


def card(p, prefix=''):
    return f'''<article class="tb-card" data-category="{p['category']}" data-search="{esc(p['title']+' '+CATEGORIES[p['category']]+' '+p['promise']+' '+p['surface'])}">
  <a class="tb-card-image" href="{href(p,prefix)}" tabindex="-1" aria-hidden="true"><img src="{prefix}assets/catalog/{p['slug']}-1.webp" alt="" width="800" height="800" loading="lazy" decoding="async"><span class="tb-badge">Coming soon</span></a><span class="tb-visually-hidden">Coming soon</span>
  <div class="tb-card-body"><p class="tb-eyebrow">{CATEGORIES[p['category']]}</p><h3><a href="{href(p,prefix)}">{esc(p['title'])}</a></h3><p>{esc(p['promise'])}</p><div class="tbv-card-stage">{icon('layers',15)} {esc(p['stage'])}</div><a class="tb-text-link" href="{href(p,prefix)}" aria-label="Explore {esc(p['title'])}">Explore product</a></div>
</article>'''


def header(prefix=''):
    links = ''.join(f'<a href="{prefix}shop.html?category={k}#collection">{v}</a>' for k,v in CATEGORIES.items() if k != 'wheels')
    return f'''<a class="tb-skip" href="#main">Skip to content</a><div class="tb-announcement">THE TORQUEBOX COLLECTION <span>Car care. Less effort.</span></div>
<header class="tb-header"><div class="tb-wrap tb-header-inner"><a href="{prefix}index.html" aria-label="TorqueBox home"><img class="tb-logo" src="{prefix}assets/branding/torquebox-wordmark.webp" alt="TORQUEBOX" width="1100" height="161"></a><button class="tb-menu-toggle" aria-expanded="false" aria-controls="tb-navigation" aria-label="Open menu"><span></span><span></span><span></span></button><nav id="tb-navigation" aria-label="Main navigation"><a href="{prefix}shop.html">Shop all</a>{links}</nav><a class="tb-cart-link" href="{prefix}index.html#cart" aria-label="View QIFOR cart">{icon('bag')}</a></div></header>'''


def footer(prefix=''):
    return f'''<footer class="tb-footer"><div class="tb-wrap"><div class="tb-footer-top"><div><img class="tb-logo" src="{prefix}assets/branding/torquebox-wordmark.webp" alt="TORQUEBOX" width="1100" height="161"><p>Car care. Less effort.<br>The right product. The right stage. A routine you understand.</p></div><div><h2>Explore</h2><a href="{prefix}shop.html">The collection</a><a href="{prefix}index.html#purchase-section">QIFOR Wind Shield Pro</a><a href="{prefix}support.html">Contact support</a></div><div><h2>Customer care</h2><a href="{prefix}shipping.html">Shipping</a><a href="{prefix}returns.html">Returns & refunds</a><a href="{prefix}privacy.html">Privacy</a><a href="{prefix}terms.html">Terms</a></div></div><div class="tb-footer-bottom">© 2026 TORQUEBOX. All rights reserved.<span>New collection: coming soon.</span></div></div></footer>'''


def head(title, description, path, prefix='', body_class=''):
    return f'''<!doctype html>
<html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} | TORQUEBOX</title><meta name="description" content="{esc(description)}"><link rel="canonical" href="https://torque-box.com/{path}"><meta property="og:title" content="{esc(title)} | TORQUEBOX"><meta property="og:description" content="{esc(description)}"><meta property="og:type" content="website"><meta property="og:url" content="https://torque-box.com/{path}"><meta name="theme-color" content="#17191b">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{prefix}assets/catalog.css?v=20261124-1"><link rel="stylesheet" href="{prefix}assets/catalog-v2.css?v=20261124-2">
<script defer src="{prefix}assets/catalog.js?v=20261124-1"></script><script defer src="{prefix}assets/catalog-v2.js?v=20261124-2"></script>
</head><body class="tb-store tb-v2 {body_class}">'''


def scene(kind):
    """Original schematic application drawings; these are not customer/result photos."""
    car = '<path d="m48 151 17-39c4-10 13-17 25-17h94c17 0 28 8 36 21l23 38 34 10v39H41v-40l7-12Z" fill="#f7fafc" stroke="#313940" stroke-width="3"/><path d="m87 108-15 42h132l-29-42H87Z" fill="#bcd8e4" stroke="#313940" stroke-width="3"/><path d="M133 108v43m-76 19h210" stroke="#313940" stroke-width="3"/><circle cx="86" cy="202" r="22" fill="#252a2f"/><circle cx="229" cy="202" r="22" fill="#252a2f"/><circle cx="86" cy="202" r="11" fill="#c8cdd2"/><circle cx="229" cy="202" r="11" fill="#c8cdd2"/>'
    wheel = '<circle cx="164" cy="135" r="73" fill="#252a2f"/><circle cx="164" cy="135" r="51" fill="#d6dce2" stroke="#818b95" stroke-width="3"/><circle cx="164" cy="135" r="13" fill="#66727d"/><path d="m164 87 0 36m46-22-33 25m17 47-22-28m-47 28 25-29m-33-42 35 25" stroke="#66727d" stroke-width="8" stroke-linecap="round"/>'
    cloth = '<path d="m200 99 71 17-17 58-68-19 14-56Z" fill="#ff974b" stroke="#ba560c" stroke-width="3"/><path d="m207 115 46 11m-51 4 46 11m-51 4 46 11" stroke="#ffbd8a" stroke-width="3"/>'
    spray = '<path d="M257 81h38v9h-17l-4 18h-13V96h-11V83l7-2Z" fill="#252a2f"/><path d="M258 108h18l9 15v56h-43v-56l16-15Z" fill="#ff974b" stroke="#ba560c" stroke-width="3"/><path d="m245 88-39-11m39 12-43 7m41-5-34 18" stroke="#75abc4" stroke-width="3" stroke-dasharray="3 6"/>'
    if kind == 'mix':
        drawing = '<path d="m96 103 15 103h101l15-103Z" fill="#bcd8e4" stroke="#313940" stroke-width="3"/><ellipse cx="161" cy="103" rx="65" ry="13" fill="#d9edf5" stroke="#313940" stroke-width="3"/><path d="M115 95c0-62 91-62 91 0" fill="none" stroke="#313940" stroke-width="4"/><path d="m247 48-12 54-34-9 13-54 33 9Z" fill="#ff974b" stroke="#ba560c" stroke-width="3"/><path d="m211 103-8 20m3-21-9 22" stroke="#ff974b" stroke-width="5" stroke-linecap="round"/><circle cx="139" cy="142" r="9" fill="#f7fafc"/><circle cx="170" cy="156" r="6" fill="#f7fafc"/>'
    elif kind in ('wheel-spray','tire-spray','wheel-brush','wheel-rinse','tire-finish','tire-check','wheel-check','iron'):
        drawing = wheel
        if 'spray' in kind or kind=='iron': drawing += spray
        if kind=='wheel-brush': drawing += '<path d="m234 94 51-33" stroke="#ba560c" stroke-width="14" stroke-linecap="round"/><path d="m209 98 36-23 14 21-36 23-14-21Z" fill="#ff974b" stroke="#ba560c" stroke-width="3"/><path d="m215 104-9 11m18-17-9 12m18-18-9 12m18-18-9 12" stroke="#313940" stroke-width="3"/>'
        if kind=='wheel-rinse': drawing += '<path d="m272 45-55 19m57-10-57 30m60-22-59 41" stroke="#75abc4" stroke-width="4" stroke-dasharray="4 7"/>'
        if kind=='tire-finish': drawing += '<path d="m218 118 48 13-9 35-46-13 7-35Z" fill="#ff974b" stroke="#ba560c" stroke-width="3"/>'
        if kind in ('tire-check','wheel-check'): drawing += '<circle cx="261" cy="72" r="22" fill="#e2f0e8"/><path d="m251 73 7 7 14-17" stroke="#428462" stroke-width="4" fill="none"/>'
        if kind=='iron': drawing += '<path d="m137 87-6 37m23-40-3 47m25-43 8 52m-65 10 5 31m58-11 12 20" stroke="#a87ab8" stroke-width="6" stroke-linecap="round"/>'
    elif kind.startswith('glass'):
        drawing = '<path d="m78 69-30 132h218L227 69H78Z" fill="#d8e9f1" stroke="#313940" stroke-width="4"/><path d="M91 83 64 188m34-5 17-71m39 42 14-47" stroke="#fff" stroke-width="6" stroke-linecap="round"/>'
        drawing += spray if kind=='glass-spray' else cloth
        if kind=='glass-finish': drawing += '<path d="m249 40 4 15 15 4-15 5-4 15-5-15-15-5 15-4 5-15Z" fill="#ff974b"/>'
    elif kind in ('connect','nozzle'):
        drawing = '<path d="M65 152h67v-38h56v15h46v32h-47l-22 38h-24l17-47h-26" fill="#f7fafc" stroke="#313940" stroke-width="4"/><path d="M49 142h20v24H49zM231 132h18v26h-18z" fill="#ff974b" stroke="#ba560c" stroke-width="3"/><path d="M21 154h27m203-8h35" stroke="#313940" stroke-width="8" stroke-linecap="round"/><circle cx="155" cy="69" r="27" fill="#fff1e5" stroke="#dc8c4d" stroke-width="2"/><path d="m144 69 8 8 15-17" fill="none" stroke="#ba560c" stroke-width="4"/>'
    elif kind in ('carpet','extract','spot','brush'):
        drawing = '<path d="M83 58h90c9 0 15 8 15 17v80l42 41v20H67v-29l27-26-11-103Z" fill="#d5dce3" stroke="#313940" stroke-width="3"/><path d="M107 75h56v76h-45l-11-76Zm-10 102h94" stroke="#9ba6b0" stroke-width="4" fill="none"/>'
        drawing += cloth if kind=='spot' else spray if kind=='carpet' else '<path d="m216 106 50 13-6 23-51-12 7-24Z" fill="#ff974b" stroke="#ba560c" stroke-width="3"/><path d="M261 128c33 17 35 45 16 68" stroke="#313940" stroke-width="10" fill="none" stroke-linecap="round"/>' if kind=='extract' else '<path d="m213 113 52-22" stroke="#ba560c" stroke-width="12"/><path d="m189 120 39-18 12 25-39 18-12-25Z" fill="#ff974b" stroke="#ba560c" stroke-width="3"/>'
    elif kind=='laundry':
        drawing = '<rect x="89" y="47" width="144" height="169" rx="10" fill="#f7fafc" stroke="#313940" stroke-width="3"/><path d="M89 83h144" stroke="#313940" stroke-width="3"/><circle cx="161" cy="147" r="48" fill="#bcd8e4" stroke="#313940" stroke-width="3"/><path d="m133 135 47 12-11 33-45-12 9-33Z" fill="#ff974b" stroke="#ba560c" stroke-width="3"/><circle cx="111" cy="65" r="6" fill="#ff974b"/>'
    else:
        drawing = car
        if kind in ('towel','cloth','buff','wash'): drawing += cloth
        elif kind=='spray': drawing += spray
        elif kind=='foam': drawing += '<path d="M63 130c25-45 92-57 145 2" stroke="#fff" stroke-width="24" stroke-linecap="round" fill="none"/><circle cx="83" cy="115" r="14" fill="#fff"/><circle cx="123" cy="98" r="18" fill="#fff"/><circle cx="172" cy="110" r="15" fill="#fff"/>' + spray
        elif kind=='blower': drawing += '<path d="M231 71h49l12 24v30h-32l-29-15V71Z" fill="#ff974b" stroke="#ba560c" stroke-width="3"/><path d="m228 87-40-13m40 22-45 1m47 7-36 17" stroke="#75abc4" stroke-width="3" stroke-dasharray="5 6"/>'
        elif kind=='electrical': drawing += '<path d="M276 49v16m14-16v16m-21 0h28v15a14 14 0 0 1-28 0V65Zm14 29v19" stroke="#ba560c" stroke-width="4" fill="none" stroke-linecap="round"/>'
        else: drawing += '<path d="m235 43-22 29m35-21-23 31m34-18-22 28m-76-24-8 15m24-14-7 16" stroke="#75abc4" stroke-width="4" stroke-linecap="round"/>'
    return f'<svg class="tbv-scene" viewBox="0 0 336 252" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="168" cy="221" rx="139" ry="12" fill="#dce2e6"/>{drawing}</svg>'


def review_section(p):
    review_cards = []
    for r in p['reviews']:
        rating = f'<span class="tbv-stars" aria-label="{r["rating"]} out of 5 stars">'+ '★'*r['rating']+'</span>' if r.get('rating') else '<span class="tbv-review-type">Owner perspective</span>'
        date = ' · '+r['date'] if r.get('date') else ''
        review_cards.append(f'''<article class="tbv-review-card"><div class="tbv-review-person"><span class="tbv-avatar" role="img" aria-label="Initials avatar for {esc(r['name'])}">{esc(r['initials'])}</span><div><h3>{esc(r['name'])}</h3><p>{esc(r['source']+date)}</p></div></div>{rating}<blockquote>“{esc(r['quote'])}”</blockquote><a class="tb-text-link" href="{esc(r['url'])}#judgeme_product_reviews" target="_blank" rel="noopener noreferrer">Read the original review</a></article>''')
    if review_cards:
        content='<div class="tbv-review-grid">'+''.join(review_cards)+'</div><p class="tbv-review-note">Selected public excerpts about the reference model, not TorqueBox orders. The original sources use initials rather than profile photos. Read the source for all ratings and the full review.</p>'
        title='What owners say elsewhere.'
    else:
        title='Your experience belongs here.'
        content=f'''<div class="tbv-review-empty">{icon('chat',36)}<div><h3>No TorqueBox customer reviews yet.</h3><p>Own this product? Tell us which version you used, how you used it and what you thought. You can include your own product photos and a profile photo in your email.</p></div></div>'''
    subject=quote('Product feedback: '+p['title'])
    return f'''<section class="tbv-section tbv-reviews" id="reviews"><div class="tbv-section-top"><div><p class="tb-eyebrow">PRODUCT FEEDBACK</p><h2>{title}</h2></div><a class="tbv-outline-button" href="mailto:suporte@torque-box.com?subject={subject}">Email product feedback</a></div>{content}</section>'''


def product_page(p):
    prefix='../'
    gallery=[p['slug']+'-1.webp',p['slug']+'-2.webp']
    if p['story'] not in gallery: gallery.append(p['story'])
    thumbnails=''.join(f'<button type="button" class="{"is-selected" if i==0 else ""}" aria-pressed="{str(i==0).lower()}" data-image="../assets/catalog/{img}" data-alt="{esc(p["title"])} — {"application reference" if img==p["story"] else "product view"}" aria-label="Show {"product view" if i==0 else "application view" if img==p["story"] else "alternate view"}"><img src="../assets/catalog/{img}" alt="" width="90" height="90"></button>' for i,img in enumerate(gallery))
    steps=''.join(f'''<li class="tbv-step"><div class="tbv-step-visual">{scene(s['scene'])}<span class="tbv-step-number">{i+1}</span></div><div class="tbv-step-copy"><h3>{esc(s['title'])}</h3><p>{esc(s['text'])}</p></div></li>''' for i,s in enumerate(p['steps']))
    reasons=''.join(f'<article class="tbv-benefit"><span class="tbv-icon">{icon(["drop","layers","spark"][i],28)}</span><h3>{esc(r["title"])}</h3><p>{esc(r["text"])}</p></article>' for i,r in enumerate(p['reasons']))
    specs=''.join(f'<tr><th scope="row">{esc(k)}</th><td>{esc(v)}</td></tr>' for k,v in p['specs'])
    faqs=''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q,a in p['faq'])
    related=''.join(card(BY_SLUG[s],'../') for s in p['related'])
    schema={'@context':'https://schema.org','@type':'Product','name':p['title'],'description':p['how'],'image':'https://torque-box.com/assets/catalog/'+p['slug']+'-1.webp','url':'https://torque-box.com/products/'+p['slug']}
    return head(p['title'],p['promise'],'products/'+p['slug'],prefix,'tbv-detail-page')+header(prefix)+f'''
<main id="main"><div class="tb-wrap">
<nav class="tb-breadcrumb" aria-label="Breadcrumb"><a href="../shop.html">Collection</a><span aria-hidden="true">/</span><a href="../shop.html?category={p['category']}#collection">{CATEGORIES[p['category']]}</a><span aria-hidden="true">/</span><span>{esc(p['title'])}</span></nav>
<section class="tb-product"><div class="tb-gallery"><div class="tb-product-photo"><span class="tb-badge">Coming soon</span><img id="tb-product-main" src="../assets/catalog/{p['slug']}-1.webp" alt="{esc(p['title'])} — product view" width="1000" height="1000" fetchpriority="high"></div><div class="tb-thumbs" role="group" aria-label="Product images">{thumbnails}</div><p class="tb-caption">Reference product shown. Final model, sizes and availability will be confirmed before launch.</p></div>
<div class="tb-product-copy"><p class="tb-eyebrow">{CATEGORIES[p['category']]} <span>/ {esc(p['brand'])}</span></p><p class="tbv-product-label">{esc(p['title'])}</p><h1>{esc(p['headline'])}</h1><p class="tb-product-intro">{esc(p['how'])}</p><div class="tbv-product-facts"><div>{icon('layers',20)}<span>Use it for<strong>{esc(p['surface'])}</strong></span></div><div>{icon('drop',20)}<span>In your routine<strong>{esc(p['stage'])}</strong></span></div></div><div class="tbv-product-actions"><a class="tb-button" href="#how-to-use">See how to use it</a><a class="tbv-outline-button" href="#overview">Explore the benefits</a></div><p class="tbv-coming-note">Part of the upcoming TorqueBox collection. Ordering and pricing are not open yet.</p></div></section>
<nav class="tb-product-tabs" aria-label="Product details"><a href="#overview">Why it helps</a><a href="#how-to-use">How to use</a><a href="#fit">Where to use</a><a href="#reviews">Feedback</a><a href="#specifications">Specifications</a></nav>
<section class="tbv-story tbv-section" id="overview"><figure class="tbv-story-photo"><img src="../assets/catalog/{p['story']}" alt="{esc(p['story_alt'])}" width="1100" height="1100" loading="lazy" decoding="async"><figcaption>Reference application image</figcaption></figure><div class="tbv-story-copy"><p class="tb-eyebrow">THE JOB IT WAS MADE FOR</p><h2>{esc(p['promise'])}</h2><p class="tbv-problem">{esc(p['problem'])}</p><p>{esc(p['payoff'])}</p><div class="tbv-result-line">{icon('check',20)}<span>{esc(p['format'])}</span></div></div></section>
<section class="tbv-benefits" aria-label="How this product helps">{reasons}</section>
<section class="tbv-section tbv-howto" id="how-to-use"><div class="tbv-section-top"><div><p class="tb-eyebrow">A CLEAR ROUTINE</p><h2>Know what to do.<br>Then enjoy the finish.</h2></div><p>Three practical steps for the reference product. <br>Illustrated application guide.</p></div><ol class="tbv-steps">{steps}</ol><div class="tbv-label-tip">{icon('sun',24)}<p>{esc(p['tip'])}</p></div></section>
<section class="tbv-fit tbv-section" id="fit"><div><p class="tb-eyebrow">THE RIGHT PRODUCT FOR THE JOB</p><h2>A good fit starts here.</h2><p>Match the product to the material and the stage of your routine.</p></div><div class="tbv-fit-cards"><article><span class="tbv-fit-label">USE IT FOR</span><h3>{esc(p['surface'])}</h3><p>{esc(p['suited'])}</p></article><article><span class="tbv-fit-label">BEFORE YOU START</span><h3>Keep the method specific.</h3><p>{esc(p['avoid'])}</p></article></div></section>
{review_section(p)}
<section class="tb-details-grid tb-technical tbv-section"><div id="specifications"><p class="tb-eyebrow">THE DETAILS, CLEARLY</p><h2>Reference specifications</h2><table class="tb-specs"><tbody>{specs}</tbody></table><details class="tbv-sources"><summary>About these product details</summary><p>Based on the reference product information, checked November 24, 2026. Confirm the supplied label and manual for the final item.</p><a class="tb-text-link" href="{esc(p['primary'])}" target="_blank" rel="noopener noreferrer">Read the reference instructions</a></details></div><div id="questions"><p class="tb-eyebrow">GOOD TO KNOW</p><h2>Your questions, answered.</h2><div class="tb-faq">{faqs}<details><summary>Can I buy this from TorqueBox now?</summary><p>Not yet. This product is being prepared for our new collection. We will confirm the final item, price and delivery details before ordering opens.</p></details></div></div></section>
<section class="tb-related"><div class="tb-section-heading"><div><p class="tb-eyebrow">MAKE THE STEPS WORK TOGETHER</p><h2>Build your routine.</h2></div><a class="tb-text-link" href="../shop.html">Explore the collection</a></div><div class="tb-grid tb-grid-three">{related}</div></section>
</div></main>{footer(prefix)}<script type="application/ld+json">{json.dumps(schema)}</script></body></html>'''


def catalog_page():
    category_data=[
        ('wash','Start with a better wash.','Lift the dirt before the finishing touches.','v-floc-shampoo-2.webp',4),
        ('dry','Get the last drops.','Towels for panels. Air for the hidden gaps.','drying-towel-story.webp',2),
        ('finish','Give clean paint a finish.','Explore spray wax and rinse-activated care.','blend-spray-wax-2.webp',2),
        ('interior','Care for the cabin.','Choose the method that matches the material.','sintra-interior-cleaner-2.webp',2),
        ('glass','Make the view clearer.','Dedicated care for glass and washer systems.','glazy-glass-cleaner-story.webp',2),
        ('wheels','Finish at the details.','Clean wheels. Prepare tires. Add your finish.','shiny-tire-dressing-story.webp',4),
    ]
    category_cards=''.join(f'<a class="tbv-category-card tbv-category-{k}" href="?category={k}#collection"><img src="assets/catalog/{img}" alt="{esc(CATEGORIES[k])} application example" width="1000" height="1000" loading="lazy"><span class="tbv-category-shade"></span><div><span class="tbv-category-count">{n} products · {CATEGORIES[k]}</span><h3>{title}</h3><p>{desc}</p><span class="tbv-category-link">Explore {CATEGORIES[k].lower()}</span></div></a>' for k,title,desc,img,n in category_data)
    buttons='<button type="button" data-filter="all" aria-pressed="true" class="is-active">All products</button>'+''.join(f'<button type="button" data-filter="{k}" aria-pressed="false">{v}</button>' for k,v in CATEGORIES.items())
    cards=''.join(card(p) for p in PRODUCTS)
    qifor='''<article class="tb-card" data-category="glass" data-search="QIFOR Wind Shield Pro windshield washer fluid glass concentrate cleaner"><a class="tb-card-image" href="index.html#purchase-section" tabindex="-1" aria-hidden="true"><img src="assets/images/qifor-wind-shield-pro.jpg" alt="" width="800" height="800" loading="lazy"><span class="tb-badge tb-badge-available">Available now</span></a><span class="tb-visually-hidden">Available now</span><div class="tb-card-body"><p class="tb-eyebrow">Glass care</p><h3><a href="index.html#purchase-section">QIFOR Wind Shield Pro</a></h3><p>Help clear oily road film from your windshield.</p><div class="tbv-card-stage">For the windshield washer system</div><a class="tb-text-link" href="index.html#purchase-section">Shop QIFOR</a></div></article>'''
    routines=[('wash','Wash','Give dirt the right first step.','Rinse loose dirt, use a suitable pre-wash when needed, then clean with the right shampoo.','v-floc-shampoo-2.webp',['pressure-washer-gun','foam-cannon','v-floc-shampoo']),('dry','Dry','Panels and hidden gaps need different tools.','Move water from mirrors and trim with air, then collect the remaining water with a clean drying towel.','drying-towel-story.webp',['air-blower','drying-towel']),('finish','Finish','Give the clean surface a finishing touch.','Choose a rinse-activated product before drying or a spray wax after washing and drying. Clean tires before dressing.','blend-spray-wax-2.webp',['hydrox-fast-sealant','blend-spray-wax','shiny-tire-dressing'])]
    tabs=''.join(f'<button id="routine-tab-{key}" role="tab" type="button" aria-selected="{str(i==0).lower()}" aria-controls="routine-panel-{key}" data-routine-tab="{key}" tabindex="{0 if i==0 else -1}">{label}</button>' for i,(key,label,*_) in enumerate(routines))
    panels=''
    for i,(key,label,title,desc,img,slugs) in enumerate(routines):
        links=''.join(f'<a class="tbv-routine-product" href="{href(BY_SLUG[s])}"><img src="assets/catalog/{s}-1.webp" alt="" width="100" height="100" loading="lazy"><span>{esc(BY_SLUG[s]["title"])}</span><span class="tbv-routine-status">Coming soon</span></a>' for s in slugs)
        panels+=f'<div class="tbv-routine-panel" id="routine-panel-{key}" role="tabpanel" aria-labelledby="routine-tab-{key}" {"hidden" if i else ""}><img class="tbv-routine-photo" src="assets/catalog/{img}" alt="{label} stage application example" width="1000" height="1000" loading="lazy"><div class="tbv-routine-copy"><p class="tb-eyebrow">{label.upper()} STAGE</p><h3>{title}</h3><p>{desc}</p><div class="tbv-routine-products">{links}</div></div></div>'
    needs=''.join(f'<button type="button" data-need-category="{k}">{label}</button>' for k,label in [('wash','A better wash'),('dry','Water in the details'),('glass','Hazy glass'),('wheels','Dirty wheels'),('interior','A fresher cabin')])
    return head('Car care. Less effort.','Understand your car care routine. Explore washing, drying, interior, glass and finishing products with clear illustrated guides.','shop',body_class='tbv-shop-page')+header()+f'''
<main id="main">
<section class="tb-shop-hero tbv-shop-hero"><div class="tb-wrap tb-hero-inner"><div class="tb-hero-copy"><p class="tb-eyebrow">YOUR CAR. YOUR ROUTINE.</p><h1>Car care.<br><span>Less effort.</span></h1><p>The right product makes more sense when you know where it fits. Discover what to use, what it helps with and how to apply it.</p><div class="tbv-hero-actions"><a class="tb-button" href="#collection">Find your next essential</a><a class="tbv-hero-link" href="#routine">Build your routine</a></div><div class="tbv-hero-signposts"><span>{icon('drop',18)} Wash with purpose</span><span>{icon('cloth',18)} Dry the details</span><span>{icon('spark',18)} Finish with care</span></div></div><div class="tb-hero-visual"><img src="assets/catalog/v-floc-shampoo-2.webp" alt="A car covered in foam during a wash" width="1050" height="1050" fetchpriority="high"><div class="tbv-hero-stamp">A clear routine.<br>A better starting point.</div><div class="tb-hero-caption">From the first rinse to the final wipe.<span>Explore the upcoming TorqueBox collection.</span></div></div></div></section>
<section class="tbv-need-strip"><div class="tb-wrap"><p>What needs attention?</p><div>{needs}</div></div></section>
<section class="tb-wrap tbv-section tbv-category-section" id="categories"><div class="tbv-section-top"><div><p class="tb-eyebrow">START WITH THE JOB</p><h2>Every part of your car.<br>A clearer way to care.</h2></div><p>Choose a category, understand the product <br>and see it in the right stage of your routine.</p></div><div class="tbv-category-grid">{category_cards}</div></section>
<section class="tbv-routine-section" id="routine"><div class="tb-wrap"><div class="tbv-section-top"><div><p class="tb-eyebrow">MAKE THE PRODUCTS MAKE SENSE</p><h2>A good finish has a process.</h2></div><p>These are product combinations to explore, <br>not pre-priced bundles.</p></div><div class="tbv-routine-tabs" role="tablist" aria-label="Explore the car care routine">{tabs}</div>{panels}</div></section>
<section class="tb-wrap tb-collection" id="collection"><div class="tb-section-heading"><div><p class="tb-eyebrow">CHOOSE YOUR NEXT ESSENTIAL</p><h2>The collection.</h2></div><p>QIFOR is available now. <br>The new range is coming soon.</p></div><div class="tb-controls"><div class="tb-filters" role="group" aria-label="Filter products by category">{buttons}</div><form role="search" id="tb-search-form"><label class="tb-visually-hidden" for="tb-search">Search products</label><input id="tb-search" name="q" type="search" placeholder="Search by product or task" autocomplete="off"><button type="submit" aria-label="Search collection">{icon('search',20)}</button></form></div><p id="tb-results" class="tb-results" role="status" aria-live="polite">16 products</p><div class="tb-grid" id="tb-product-grid">{cards}{qifor}</div><div class="tb-empty" id="tb-empty" hidden><h3>No products found.</h3><p>Try a different category or search term.</p><button class="tb-button" type="button" id="tb-reset">Show all products</button></div><p class="tb-collection-note">New products are previews. Reference models are shown; final items, pricing and delivery details will be confirmed before ordering opens.</p></section>
<section class="tbv-role-section"><div class="tb-wrap"><div class="tbv-section-top"><div><p class="tb-eyebrow">PICK WITH CONFIDENCE</p><h2>Different jobs. Different products.</h2></div></div><div class="tbv-role-grid"><article>{icon('drop',30)}<h3>Shampoo cleans.</h3><p>Use it during the contact wash to help remove exterior dirt with a wash mitt.</p><a class="tb-text-link" href="products/v-floc-shampoo.html">Understand V-Floc</a></article><article>{icon('cloth',30)}<h3>A blower moves water.</h3><p>Reach mirrors, grilles and gaps, then use a towel for water left on the panels.</p><a class="tb-text-link" href="products/air-blower.html">Explore air drying</a></article><article>{icon('spark',30)}<h3>A finish comes after cleaning.</h3><p>Use the correct method for a spray wax or a rinse-activated protective product.</p><a class="tb-text-link" href="?category=finish#collection">Explore paint care</a></article></div></div></section>
<section class="tb-qifor-banner"><div class="tb-wrap"><div><p class="tb-eyebrow">AVAILABLE IN THE STORE</p><h2>Start with your windshield.</h2><p>Explore QIFOR Wind Shield Pro, our existing glass-care product.</p></div><a class="tb-button" href="index.html#purchase-section">Shop QIFOR</a></div></section>
</main>{footer()}</body></html>'''


def main():
    (ROOT/'shop.html').write_text(catalog_page())
    for p in PRODUCTS:
        (ROOT/'products'/(p['slug']+'.html')).write_text(product_page(p))
    print(f'Rendered catalog and {len(PRODUCTS)} product pages. QIFOR files were not touched.')


if __name__ == '__main__':
    main()
