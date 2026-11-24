"""Render the TorqueBox storefront. QIFOR and its checkout are not modified."""
from pathlib import Path
from html import escape as e
import json
import render_catalog_photo as photos

ROOT = photos.ROOT
PRODUCTS = photos.PRODUCTS
BY_SLUG = photos.BY_SLUG
CATS = photos.CATS
icon = photos.icon
THEMES = {key: ('#ad4800', '#fff0e3') for key in CATS}
SHORT = {'wash': 'Wash & foam', 'dry': 'Drying', 'finish': 'Paint & gloss',
         'interior': 'Interior', 'glass': 'Glass', 'wheels': 'Wheels & tires'}
PICKS = {'wash': 'foam-cannon', 'dry': 'drying-towel', 'finish': 'blend-spray-wax',
         'interior': 'sintra-interior-cleaner', 'glass': 'glazy-glass-cleaner',
         'wheels': 'shiny-tire-dressing'}



COMPACT = {
    'drying-towel':'Drying Towel', 'pressure-washer-gun':'Spray Gun',
    'foam-cannon':'Foam Cannon', 'air-blower':'Air Blower',
    'v-floc-shampoo':'V-Floc Shampoo', 'v-mol-prewash':'V-Mol Prewash',
    'sintra-interior-cleaner':'Sintra Fast', 'glazy-glass-cleaner':'Glazy Glass',
    'hydrox-fast-sealant':'Hydrox Fast', 'blend-spray-wax':'Blend Spray',
    'delet-tire-cleaner':'Delet Cleaner', 'vexus-wheel-cleaner':'Vexus Cleaner',
    'shiny-tire-dressing':'Shiny Dressing', 'izer-iron-remover':'Izer Remover',
    'impact-all-purpose-cleaner':'Impact Cleaner',
}
TILE_NAMES = {'wash':'Wash', 'dry':'Dry', 'finish':'Finish', 'interior':'Interior', 'glass':'Glass', 'wheels':'Wheels'}

def glyph(name,size=22):
    shapes={
      'heart':'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
      'mail':'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
      'book':'<path d="M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2V4Z"/>',
      'headset':'<path d="M4 13v-2a8 8 0 0 1 16 0v2M20 17v2a3 3 0 0 1-3 3h-4"/><rect x="2" y="11" width="4" height="8" rx="2"/><rect x="18" y="11" width="4" height="8" rx="2"/>',
      'shield':'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
      'instagram':'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
      'down':'<path d="m6 9 6 6 6-6"/>',
    }
    if name not in shapes:return icon(name,size)
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{shapes[name]}</svg>'

def brand(prefix=''):
    src=prefix+'assets/branding/torquebox-wordmark.webp'
    return f'<span class="reference-brand-art"><img src="{src}" alt="TORQUEBOX" width="1100" height="161"><img class="reference-brand-accent" src="{src}" alt="" aria-hidden="true" width="1100" height="161"></span>'

def save_button(slug,title):
    return f'<button class="save-product" type="button" data-save-product="{slug}" aria-pressed="false" aria-label="Save {e(title)}">{glyph("heart",20)}</button>'

def related_slugs(p):
    result=list(p['related'])
    for q in PRODUCTS:
        if q['slug']!=p['slug'] and q['slug'] not in result:result.append(q['slug'])
        if len(result)>=4:break
    return result[:4]


def theme(category):
    color, soft = THEMES[category]
    return f'--category-color:{color};--category-soft:{soft}'


def head(title, desc, path, prefix='', page='', product=None):
    product_attrs = f' data-current-product="{product["slug"]}" data-current-category="{product["category"]}"' if product else ''
    return f'''<!doctype html>
<html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)} | TORQUEBOX</title><meta name="description" content="{e(desc)}"><meta name="theme-color" content="#111111">
<link rel="canonical" href="https://torque-box.com/{path}"><meta property="og:title" content="{e(title)} | TORQUEBOX"><meta property="og:description" content="{e(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="https://torque-box.com/{path}">
<meta property="og:image" content="https://torque-box.com/assets/photography/reference-road-hero.webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{prefix}assets/catalog-v3.css"><link rel="stylesheet" href="{prefix}assets/catalog-v5.css"><script defer src="{prefix}assets/catalog-v5.js"></script>
</head><body class="photo-store market-store {page}"{product_attrs}>'''


def header(prefix=''):
    categories=''.join(f'<a href="{prefix}collection.html?category={k}#collection" data-category-link="{k}">{v}</a>' for k,v in SHORT.items())
    known=json.dumps([p['slug'] for p in PRODUCTS]+['qifor'])
    return f'''<a class="skip-link" href="#main">Skip to content</a>
<div class="store-announcement reference-announcement"><div class="shell"><span>{glyph('check',15)} Car care. Less effort.</span><a href="{prefix}index.html#purchase-section">QIFOR available in the store</a></div></div>
<header class="store-header reference-header"><div class="shell reference-header-inner"><a class="reference-brand" href="{prefix}shop.html" aria-label="TorqueBox collection">{brand(prefix)}<small>CAR CARE. LESS EFFORT.</small></a>
<nav class="reference-nav store-nav" aria-label="Main navigation"><a class="reference-home-link" href="{prefix}shop.html">Home</a><a href="{prefix}collection.html#collection">Shop</a><details class="reference-dropdown"><summary>Categories {glyph('down',13)}</summary><div>{categories}</div></details><a href="{prefix}shop.html#why-torquebox">About</a><a href="{prefix}support.html">Contact</a></nav>
<form class="store-search reference-search" id="search" role="search" action="{prefix}collection.html#collection" method="get"><label class="sr-only" for="product-search">Search products</label><input type="search" id="product-search" name="q" placeholder="Search products…" autocomplete="off"><button type="submit" aria-label="Search collection">{glyph('search',19)}</button></form>
<div class="reference-header-actions"><a href="{prefix}collection.html?saved=1#collection" class="saved-products-link" aria-label="Saved products">{glyph('heart',23)}<span data-saved-count hidden>0</span></a><a href="{prefix}index.html#purchase-section" aria-label="Shop QIFOR" class="reference-qifor-link">{glyph('bag',23)}<span data-qifor-count hidden>0</span></a></div></div></header><script id="catalog-slugs" type="application/json">{known}</script>'''


def footer(prefix=''):
    return f'''<section class="reference-newsletter"><div class="shell"><div class="newsletter-title">{glyph('mail',39)}<div><h2>Join Our Newsletter</h2><p>Get TorqueBox collection news and product updates.</p></div></div><form class="reference-newsletter-form" data-newsletter-form><label class="sr-only" for="newsletter-email">Your email address</label><input id="newsletter-email" name="email" type="email" autocomplete="email" placeholder="Your email address" maxlength="254" required><input class="newsletter-honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button type="submit">Subscribe</button><p class="newsletter-message" data-newsletter-message role="status" aria-live="polite"></p><small>By subscribing, you request product updates. Unsubscribe through support. <a href="{prefix}privacy.html">Privacy</a>.</small></form><div class="reference-socials"><a href="https://www.instagram.com/torquebox0/" target="_blank" rel="noopener noreferrer" aria-label="TorqueBox Instagram">{glyph('instagram',20)}</a><a href="mailto:suporte@torque-box.com" aria-label="Email TorqueBox">{glyph('mail',20)}</a></div></div></section>
<footer class="store-footer reference-footer"><div class="shell reference-footer-main"><a class="reference-brand" href="{prefix}shop.html" aria-label="TorqueBox home">{brand(prefix)}<small>CAR CARE. LESS EFFORT.</small></a><nav aria-label="Footer navigation"><a href="{prefix}collection.html#collection">Shop</a><a href="{prefix}shop.html#why-torquebox">About</a><a href="{prefix}support.html">Contact</a><a href="{prefix}shipping.html">Shipping</a><a href="{prefix}returns.html">Refunds</a></nav><a class="reference-payment-label" href="{prefix}index.html#purchase-section">{glyph('shield',22)}<span>QIFOR card checkout<br><strong>Powered by Stripe</strong></span></a></div><div class="shell reference-footer-bottom"><span>© 2026 TORQUEBOX. All rights reserved.</span><div><a href="{prefix}privacy.html">Privacy Policy</a><a href="{prefix}terms.html">Terms of Service</a><a href="{prefix}support.html">Support</a></div></div></footer>'''


def card(p,prefix='',recent=False):
    url=prefix+'products/'+p['slug']+'.html';still=photos.pack(p);action=p['gallery'][0]
    return f'''<article class="store-card reference-card" data-product-card data-product-slug="{p['slug']}" data-category="{p['category']}" data-title="{e(p['title'])}" data-search="{e(p['title']+' '+p['promise']+' '+p['surface']+' '+CATS[p['category']])}" style="{theme(p['category'])}"><a class="store-card-photo" href="{url}" tabindex="-1" aria-hidden="true"><img class="store-pack" src="{prefix}{still['src']}" alt="" width="800" height="800" loading="lazy" decoding="async"><img class="store-action" src="{prefix}{action['src']}" alt="" width="800" height="800" loading="lazy" decoding="async"></a>{save_button(p['slug'],p['title'])}<div class="store-card-copy"><h3><a href="{url}" aria-label="{e(p['title'])}"><span class="card-title-full">{e(p['title'])}</span><span class="card-title-short">{e(COMPACT[p['slug']])}</span></a></h3><span class="reference-card-meta">6 photos <i aria-hidden="true">·</i> <span>{SHORT[p['category']]}</span></span><span class="store-preview-label">Coming soon</span><a class="store-card-cta" href="{url}" aria-label="Explore {e(p['title'])}"><span class="card-cta-full">View product</span><span class="card-cta-short">View</span></a></div></article>'''


def qifor_card():
    return f'''<article class="store-card reference-card qifor-store-card" data-product-card data-product-slug="qifor" data-category="glass" data-title="QIFOR Wind Shield Pro" data-search="QIFOR windshield washer fluid glass cleaner concentrate" style="{theme('glass')}"><a class="store-card-photo" href="index.html#purchase-section" tabindex="-1" aria-hidden="true"><img class="store-pack" src="assets/images/qifor-wind-shield-pro.jpg" alt="" width="800" height="800" loading="lazy"></a>{save_button('qifor','QIFOR Wind Shield Pro')}<div class="store-card-copy"><h3><a href="index.html#purchase-section" aria-label="QIFOR Wind Shield Pro"><span class="card-title-full">QIFOR Wind Shield Pro</span><span class="card-title-short">QIFOR Glass Care</span></a></h3><span class="reference-card-meta">Glass care</span><span class="store-ready-label">Available now</span><a class="store-card-cta" href="index.html#purchase-section"><span class="card-cta-full">Shop QIFOR</span><span class="card-cta-short">Shop</span></a></div></article>'''


def recent_section(prefix=''):
    templates = ''.join(f'<template data-recent-template="{p["slug"]}">{card(p,prefix,True)}</template>' for p in PRODUCTS)
    return f'''<section class="shell store-section recently-viewed" data-recent-section hidden><div class="store-section-head"><div><span class="store-kicker">KEEP EXPLORING</span><h2>Recently viewed</h2></div><a class="store-link" href="{prefix}collection.html#collection">Back to the collection</a></div><div class="store-recent-grid" data-recent-grid></div>{templates}</section>'''


def category_tiles():
    return ''.join(f'<a class="reference-category" href="collection.html?category={key}#collection"><img src="{photos.pack(BY_SLUG[PICKS[key]])["src"]}" alt="" width="240" height="200" loading="lazy"><strong><span class="category-name-full">{label}</span><span class="category-name-short">{TILE_NAMES[key]}</span></strong></a>' for key,label in SHORT.items())


def home_feedback():
    quotes=[]
    for slug in ['drying-towel','pressure-washer-gun','foam-cannon']:
        p=BY_SLUG[slug];r=p['reviews'][0]
        quotes.append(f'<article class="reference-quote"><span class="reference-avatar" aria-hidden="true">{e(r["initials"])}</span><div><blockquote>“{e(r["quote"])}”</blockquote><span class="reference-quote-stars" aria-label="5 out of 5 stars">★★★★★</span><strong>{e(r["name"])}</strong><a href="{e(r["url"])}#judgeme_product_reviews" target="_blank" rel="noopener noreferrer">Original review</a></div></article>')
    return ''.join(quotes)

def catalog_page():
    featured=''.join(card(BY_SLUG[slug]) for slug in ['drying-towel','pressure-washer-gun','foam-cannon','air-blower'])
    slides=[
      ('assets/photography/reference-road-hero.webp','A graphite sports car on an open road at dusk','PREMIUM CAR CARE','Car care. <em>Less effort.</em>','The tools and formulas for your next great detail.','collection.html#collection','Shop the collection'),
      (BY_SLUG['drying-towel']['gallery'][0]['src'],'Drying a freshly washed car with microfiber','DRYING ESSENTIALS','Every drop. <em>Every detail.</em>','A towel for clean panels. Air for the places in between.','collection.html?category=dry#collection','Explore drying'),
      (BY_SLUG['foam-cannon']['gallery'][0]['src'],'A foam cannon being used during a car wash','WASH WITH PURPOSE','A better <em>wash routine.</em>','Get to know your next wash-day essentials.','collection.html?category=wash#collection','Explore wash tools'),
    ]
    hero=''.join(f'<article class="reference-hero-slide" data-hero-slide {"hidden" if i else ""}><img src="{src}" alt="{alt}" width="1700" height="567" {"fetchpriority=high" if not i else "loading=lazy"}><div class="reference-hero-shade"></div><div class="shell"><div class="reference-hero-copy"><span class="reference-eyebrow">{kicker}</span><h1>{heading}</h1><p>{copy}</p><a class="reference-pill" href="{href}">{cta}</a></div></div></article>' for i,(src,alt,kicker,heading,copy,href,cta) in enumerate(slides))
    dots=''.join(f'<button type="button" data-hero-index="{i}" aria-label="Show banner {i+1} of 3" aria-pressed="{str(i==0).lower()}" class="{"is-active" if i==0 else ""}"></button>' for i in range(3))
    benefits=[('shield','Clear product details','Understand before you choose','collection.html#collection'),('book','Photographic guides','See the routine in action','products/drying-towel.html#how-to-use'),('headset','Here to help','Ask TorqueBox','support.html'),('bag','QIFOR checkout','Shop the original essential','index.html#purchase-section')]
    why=''.join(f'<a href="{url}">{glyph(ic,35)}<strong>{title}</strong><span>{text}</span></a>' for ic,title,text,url in benefits)
    return head('Car care. Less effort.','Explore TorqueBox car care through photographic categories, four-product shelves and clear product guides.','shop',page='home-page')+header()+f'''
<main id="main"><section class="reference-hero" data-hero-carousel tabindex="0" aria-roledescription="carousel" aria-label="TorqueBox highlights">{hero}<button class="reference-hero-prev" type="button" data-hero-prev aria-label="Previous banner">{glyph('left',22)}</button><button class="reference-hero-next" type="button" data-hero-next aria-label="Next banner">{glyph('right',22)}</button><div class="reference-hero-dots" role="group" aria-label="Choose a banner">{dots}</div><span class="reference-hero-credit">Illustrative imagery</span></section>
<div class="reference-home-content"><section class="shell reference-category-panel"><h2 class="reference-section-title">Shop by Category</h2><div class="reference-category-grid">{category_tiles()}</div></section>
<section class="shell reference-product-section" id="collection"><div class="reference-heading-row"><h2 class="reference-section-title">Our Car Care Picks</h2><a href="collection.html#collection">View all products</a></div><div class="reference-product-grid">{featured}</div></section>
<section class="shell reference-campaign"><img src="assets/photography/reference-wheel-banner.webp" alt="Detail of an alloy wheel with orange accents" width="1700" height="567" loading="lazy"><div class="reference-campaign-shade"></div><div class="reference-campaign-copy"><h2>Great care.<br><em>Down to the details.</em></h2><p>Discover your next car-care essential.</p></div><a class="reference-pill" href="collection.html#collection">Explore the collection</a></section>
<section class="shell reference-why" id="why-torquebox"><img src="assets/photography/reference-dashboard-banner.webp" alt="" aria-hidden="true" width="1700" height="567" loading="lazy"><div class="reference-why-shade"></div><h2 class="reference-section-title">Why Choose TorqueBox?</h2><div class="reference-benefits">{why}</div></section>
<section class="shell reference-feedback" id="feedback"><h2 class="reference-section-title">Product Feedback</h2><p class="reference-feedback-source">Public reviews of the reference products. These are not TorqueBox orders.</p><div class="reference-quote-grid">{home_feedback()}</div></section></div></main>{footer()}</body></html>'''

def collection_page():
    counts={key:sum(p['category']==key for p in PRODUCTS)+(1 if key=='glass' else 0) for key in CATS}
    filters='<button type="button" data-category-filter="all" aria-pressed="true" class="is-active"><span>All products</span><small>16</small></button>'+''.join(f'<button type="button" data-category-filter="{key}" aria-pressed="false"><span>{label}</span><small>{counts[key]}</small></button>' for key,label in SHORT.items())
    cards=qifor_card()+''.join(card(p) for p in PRODUCTS)
    return head('The TorqueBox Collection','Browse all TorqueBox car-care previews and QIFOR. Filter by category and explore each photographic product guide.','collection',page='collection-page')+header()+f'''
<main id="main"><section class="shell store-section store-collection" id="collection"><div class="store-section-head"><div><span class="store-kicker">THE TORQUEBOX COLLECTION</span><h1 id="collection-title">Explore the collection.</h1><p id="collection-description">Choose the job. Discover the product. See how to use it.</p></div><a class="store-link" href="support.html">Help me choose</a></div><div class="store-catalog-layout"><aside class="store-filter-panel" aria-label="Product categories"><h2>Shop by category</h2><div class="store-category-filters" role="group" aria-label="Filter by category">{filters}</div><div class="store-filter-help"><strong>Know your next essential.</strong><p>Six photographic views and a clear usage guide on every new product page.</p><a href="support.html">Ask TorqueBox</a></div></aside><div class="store-catalog-results"><div class="store-results-toolbar"><p id="result-count" role="status" aria-live="polite">16 products</p><div><label for="product-sort">Sort by</label><select id="product-sort"><option value="featured">Featured</option><option value="name">Name: A–Z</option><option value="name-desc">Name: Z–A</option></select></div></div><div class="store-active-filter" id="active-filter" hidden><span id="active-filter-label"></span><button type="button" id="clear-category">Clear category</button></div><div class="store-product-grid" id="product-grid">{cards}</div><div class="store-empty" id="empty-results" hidden><h2>Let’s find your next essential.</h2><p>No matches this time. Try another name, category or saved product.</p><button class="store-button orange" id="reset-search" type="button">Show all products</button></div><p class="store-preview-note">The new collection is a preview. Final models, prices and delivery details will be confirmed before ordering opens.</p></div></div></section>{recent_section()}</main>{footer()}</body></html>'''


def product_page(p):
    g = p['gallery']; first=g[0]; still=photos.pack(p)
    thumbs = ''.join(f'<button class="photo-thumb {"is-active" if i==0 else ""}" type="button" aria-label="View photo {i+1} of 6: {e(im["alt"])}" aria-pressed="{str(i==0).lower()}" data-photo-index="{i}" data-src="../{im["src"]}" data-alt="{e(im["alt"])}" data-kind="{im["kind"]}" data-origin="{im["origin"]}"><img src="../{im["src"]}" alt="" width="100" height="100" loading="eager" decoding="async"></button>' for i,im in enumerate(g))
    reasons = ''.join(f'<li>{icon("check",19)}<span>{e(r["text"])}</span></li>' for r in p['reasons'])
    specs = ''.join(f'<tr><th scope="row">{e(k)}</th><td>{e(v)}</td></tr>' for k,v in p['specs'])
    faq = ''.join(f'<details><summary>{e(q)}{icon("plus",20)}</summary><p>{e(a)}</p></details>' for q,a in p['faq'])
    related = ''.join(card(BY_SLUG[s],'../') for s in related_slugs(p))
    extra = next((im for im in g[1:] if im['kind']=='application' and im['src']!=first['src']),first)
    schema = {'@context':'https://schema.org','@type':'Product','name':p['title'],'description':p['how'],'image':['https://torque-box.com/'+x['src'] for x in g],'url':'https://torque-box.com/products/'+p['slug']}
    return head(p['title'],p['promise'],'products/'+p['slug'],'../','product-page',p)+header('../')+f'''
<main id="main" style="{theme(p['category'])}"><div class="shell store-product-shell">
<nav class="store-breadcrumb" aria-label="Breadcrumb"><a href="../collection.html?category={p['category']}#collection" data-back-collection>Back to collection</a><span aria-hidden="true">/</span><a href="../collection.html?category={p['category']}#collection">{SHORT[p['category']]}</a><span aria-hidden="true">/</span><span>{e(p['title'])}</span></nav>
<section class="store-product-hero"><div class="store-gallery-column"><div class="store-gallery-heading"><span>{SHORT[p['category']]}</span><strong>SEE IT. KNOW IT.</strong></div><div class="product-gallery" data-gallery><div class="photo-stage" tabindex="0" role="region" aria-label="{e(p['title'])} photo carousel"><img class="main-photo" data-main-photo src="../{first['src']}" alt="{e(first['alt'])}" width="1100" height="1100" fetchpriority="high"><span class="gallery-count" data-photo-count aria-live="polite">01 / 06</span><span class="gallery-origin" data-photo-origin>{'Illustrative application' if first['origin']=='generated' else 'Application reference'}</span><div class="pack-inset" data-pack-inset><img src="../{still['src']}" alt="{e(p['title'])} product packaging" width="150" height="190"></div><div class="photo-arrows"><button type="button" aria-label="Previous photo" data-photo-prev>{icon('left')}</button><button type="button" aria-label="Next photo" data-photo-next>{icon('right')}</button></div></div><div class="photo-thumbs" role="group" aria-label="Six product photographs">{thumbs}</div><p class="gallery-help">Six views to explore. Swipe on mobile or select a photo.</p></div></div>
<div class="store-buybox">{save_button(p['slug'],p['title'])}<div class="store-buybox-top"><span class="store-category-tag">{SHORT[p['category']]}</span><span class="store-launch-badge">Collection preview</span></div><p class="store-product-name">{e(p['title'])}</p><h1>{e(p['headline'])}</h1><p class="store-product-description">{e(p['how'])}</p><ul class="store-product-benefits">{reasons}</ul><div class="store-product-facts"><div><span>WHEN TO USE</span><strong>{e(p['stage'])}</strong></div><div><span>MADE FOR</span><strong>{e(p['surface'])}</strong></div></div><a class="store-button orange" href="#how-to-use">See how to use it</a><a class="store-button pale" href="../support.html">Ask about this product</a><div class="store-launch-note"><strong>Get to know your next essential.</strong><p>Preview only. Price, final model and delivery details will be confirmed before ordering opens.</p></div><a class="store-link store-back-link" href="../collection.html?category={p['category']}#collection" data-back-collection>Keep exploring {SHORT[p['category']].lower()}</a></div></section>
<nav class="store-product-tabs" aria-label="Product sections"><a href="#in-action" aria-current="location">Why use it</a><a href="#how-to-use">How to use</a><a href="#fit">Where it fits</a><a href="#details">Product details</a><a href="#reviews">Feedback</a></nav>
<section class="store-in-action store-section" id="in-action"><div><span class="store-kicker">THE DIFFERENCE IS IN THE DETAILS</span><h2>{e(p['promise'])}</h2><p class="store-action-lead">{e(p['problem'])}</p><p>{e(p['payoff'])}</p><a class="store-button orange" href="#how-to-use">Find your routine</a></div><figure><img src="../{extra['src']}" alt="{e(extra['alt'])}" width="1100" height="1100" loading="lazy"><figcaption>Application reference</figcaption></figure></section>
<section class="store-how store-section" id="how-to-use"><div class="store-section-head"><div><span class="store-kicker">YOUR PRODUCT. YOUR ROUTINE.</span><h2>A little know-how goes a long way.</h2><p>Preparation, application and the finishing touch.</p></div><span class="store-guide-label">YOUR APPLICATION GUIDE</span></div><ol class="photo-steps">{photos.photo_guide(p)}</ol><div class="method-note"><span>THE DETAIL THAT MATTERS</span><p>{e(p['tip'])}</p></div><p class="store-photo-disclosure">Product photography is combined with illustrative application scenes, including AI-generated images. These explain the routine and do not represent customer results. Follow the supplied label and equipment instructions.</p></section>
<section class="store-fit store-section" id="fit"><div><span class="store-kicker">GOOD CARE STARTS WITH THE RIGHT FIT</span><h2>Know where it belongs.</h2></div><div><span class="store-fit-label">USE IT FOR</span><p>{e(p['suited'])}</p></div><div><span class="store-fit-label">KEEP IN MIND</span><p>{e(p['avoid'])}</p></div></section>
<section class="store-details-grid store-section" id="details"><div class="store-detail-panel"><span class="store-kicker">THE PRODUCT AT A GLANCE</span><h2>Details that matter.</h2><table class="spec-table"><tbody>{specs}</tbody></table><a class="store-link" href="{e(p['primary'])}" target="_blank" rel="noopener noreferrer">Reference product instructions</a></div><div class="store-detail-panel faq"><span class="store-kicker">BEFORE YOU CHOOSE</span><h2>Good questions.</h2>{faq}<details><summary>When can I order this product?{icon('plus',20)}</summary><p>This upcoming product does not have a confirmed price or launch date. TorqueBox will confirm the final item and delivery details before opening orders.</p></details></div></section>
<div class="store-feedback-panel">{photos.reviews(p)}</div>
<section class="store-section store-related"><div class="store-section-head"><div><span class="store-kicker">THE NEXT PART OF YOUR ROUTINE</span><h2>Keep the good care going.</h2></div><a class="store-link" href="../collection.html?category={p['category']}#collection" data-back-collection>Back to the collection</a></div><div class="store-related-grid">{related}</div></section></div>
{recent_section('../')}
<section class="store-support-banner"><div class="shell"><div><span>A LITTLE HELP BEFORE YOU CHOOSE?</span><h2>Let’s talk car care.</h2><p>Get clear information about the product and its use.</p></div><a class="store-button orange" href="../support.html">Contact TorqueBox</a></div></section></main>{footer('../')}<script type="application/ld+json">{json.dumps(schema)}</script></body></html>'''


def main():
    for p in PRODUCTS:
        assert len(p['gallery'])==6 and len({x['src'] for x in p['gallery']})==6
        assert all((ROOT/x['src']).is_file() for x in p['gallery'])
        (ROOT/'products'/(p['slug']+'.html')).write_text(product_page(p))
    (ROOT/'shop.html').write_text(catalog_page())
    (ROOT/'collection.html').write_text(collection_page())
    print('Rendered reference-layout home, full collection and 15 product pages. Six-photo galleries and QIFOR preserved.')


if __name__ == '__main__':
    main()
