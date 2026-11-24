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
THEMES = {
    'wash': ('#1763ae', '#e8f2ff'),
    'dry': ('#bd5300', '#fff0de'),
    'finish': ('#6944bd', '#f0eaff'),
    'interior': ('#087469', '#e0f4ed'),
    'glass': ('#196da9', '#e3f3ff'),
    'wheels': ('#4b5379', '#e9ecf8'),
}
SHORT = {'wash': 'Wash & foam', 'dry': 'Drying', 'finish': 'Paint & gloss',
         'interior': 'Interior', 'glass': 'Glass', 'wheels': 'Wheels & tires'}
PICKS = {'wash': 'foam-cannon', 'dry': 'drying-towel', 'finish': 'blend-spray-wax',
         'interior': 'sintra-interior-cleaner', 'glass': 'glazy-glass-cleaner',
         'wheels': 'shiny-tire-dressing'}


def theme(category):
    color, soft = THEMES[category]
    return f'--category-color:{color};--category-soft:{soft}'


def head(title, desc, path, prefix='', page='', product=None):
    product_attrs = f' data-current-product="{product["slug"]}" data-current-category="{product["category"]}"' if product else ''
    return f'''<!doctype html>
<html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)} | TORQUEBOX</title><meta name="description" content="{e(desc)}"><meta name="theme-color" content="#ff7900">
<link rel="canonical" href="https://torque-box.com/{path}"><meta property="og:title" content="{e(title)} | TORQUEBOX"><meta property="og:description" content="{e(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="https://torque-box.com/{path}">
<meta property="og:image" content="https://torque-box.com/assets/photography/garage-hero.webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{prefix}assets/catalog-v3.css?v=20261124-photo-1"><link rel="stylesheet" href="{prefix}assets/catalog-v4.css?v=20261124-store-1"><script defer src="{prefix}assets/catalog-v4.js?v=20261124-store-1"></script>
</head><body class="photo-store market-store {page}"{product_attrs}>'''


def header(prefix=''):
    nav = ''.join(f'<a href="{prefix}shop.html?category={k}#collection" data-category-link="{k}">{v}</a>' for k, v in SHORT.items())
    return f'''<a class="skip-link" href="#main">Skip to content</a>
<div class="store-announcement"><div class="shell"><strong>CAR CARE. LESS EFFORT.</strong><span>Tools, formulas and the know-how to use them.</span><a href="{prefix}support.html">Need help choosing?</a></div></div>
<header class="store-header"><div class="shell store-header-main">
<a class="store-brand" href="{prefix}shop.html" aria-label="TorqueBox collection"><img src="{prefix}assets/branding/torquebox-wordmark.webp" alt="TORQUEBOX" width="1100" height="161"></a>
<form class="store-search" id="search" role="search" action="{prefix}shop.html#collection" method="get"><label class="sr-only" for="product-search">Search products</label><input type="search" id="product-search" name="q" placeholder="Search towels, tools, cleaners…" autocomplete="off"><button type="submit" aria-label="Search collection">{icon('search',24)}</button></form>
<a class="header-shop-link" href="{prefix}index.html#purchase-section">{icon('bag',20)}<span>Shop QIFOR</span></a>
</div><div class="store-nav-wrap"><nav class="shell store-nav" aria-label="Shop by category"><a href="{prefix}shop.html#collection" data-category-link="all">All products</a>{nav}<a class="nav-support" href="{prefix}support.html">Talk to TorqueBox</a></nav></div></header>'''


def footer(prefix=''):
    return f'''<footer class="store-footer"><div class="shell"><div class="store-footer-top"><div><img src="{prefix}assets/branding/torquebox-wordmark.webp" alt="TORQUEBOX" width="1100" height="161"><p>Car care. Less effort.<br>For the car you care about.</p></div><div><h2>Find your next essential</h2><a href="{prefix}shop.html#collection">All products</a><a href="{prefix}shop.html?category=dry#collection">Towels & drying tools</a><a href="{prefix}index.html#purchase-section">Shop QIFOR</a></div><div><h2>Here to help</h2><a href="{prefix}support.html">Contact TorqueBox</a><a href="{prefix}shipping.html">Shipping information</a><a href="{prefix}returns.html">Returns & refunds</a></div><div><h2>Talk to us</h2><a href="mailto:suporte@torque-box.com">suporte@torque-box.com</a><p>Questions about fit or use?<br>Ask before you choose.</p></div></div><div class="store-footer-bottom"><span>© 2026 TORQUEBOX</span><div><a href="{prefix}privacy.html">Privacy</a><a href="{prefix}terms.html">Terms</a></div><span>New collection previews. QIFOR available now.</span></div></div></footer>'''


def card(p, prefix='', recent=False):
    url = prefix+'products/'+p['slug']+'.html'
    still = photos.pack(p)
    action = p['gallery'][0]
    return f'''<article class="store-card" data-product-card data-product-slug="{p['slug']}" data-category="{p['category']}" data-title="{e(p['title'])}" data-search="{e(p['title']+' '+p['promise']+' '+p['surface']+' '+CATS[p['category']])}" style="{theme(p['category'])}">
<a class="store-card-photo" href="{url}" tabindex="-1" aria-hidden="true"><img class="store-pack" src="{prefix}{still['src']}" alt="" width="800" height="800" loading="lazy" decoding="async"><img class="store-action" src="{prefix}{action['src']}" alt="" width="800" height="800" loading="lazy" decoding="async"><span class="store-photo-count">6 photos</span></a>
<div class="store-card-copy"><span class="store-category-tag">{SHORT[p['category']]}</span><h3><a href="{url}">{e(p['title'])}</a></h3><p>{e(p['promise'])}</p><span class="store-preview-label">Collection preview</span><a class="store-card-cta" href="{url}" aria-label="Explore {e(p['title'])}">Explore product</a></div></article>'''


def qifor_card():
    return f'''<article class="store-card qifor-store-card" data-product-card data-category="glass" data-title="QIFOR Wind Shield Pro" data-search="QIFOR windshield washer fluid glass cleaner concentrate" style="{theme('glass')}"><a class="store-card-photo" href="index.html#purchase-section" tabindex="-1" aria-hidden="true"><img class="store-pack" src="assets/images/qifor-wind-shield-pro.jpg" alt="" width="800" height="800" loading="lazy"><span class="store-available-badge">Available now</span></a><div class="store-card-copy"><span class="store-category-tag">Glass care</span><h3><a href="index.html#purchase-section">QIFOR Wind Shield Pro</a></h3><p>Help clear oily road film from your windshield.</p><span class="store-ready-label">In the TorqueBox store</span><a class="store-card-cta" href="index.html#purchase-section">Shop QIFOR</a></div></article>'''


def recent_section(prefix=''):
    templates = ''.join(f'<template data-recent-template="{p["slug"]}">{card(p,prefix,True)}</template>' for p in PRODUCTS)
    return f'''<section class="shell store-section recently-viewed" data-recent-section hidden><div class="store-section-head"><div><span class="store-kicker">KEEP EXPLORING</span><h2>Recently viewed</h2></div><a class="store-link" href="{prefix}shop.html#collection">Back to the collection</a></div><div class="store-recent-grid" data-recent-grid></div>{templates}</section>'''


def category_tiles():
    cards = []
    for key, label in SHORT.items():
        p = BY_SLUG[PICKS[key]]
        count = sum(x['category']==key for x in PRODUCTS)+(1 if key=='glass' else 0)
        cards.append(f'<a class="category-tile" href="?category={key}#collection" data-category-link="{key}" style="{theme(key)}"><span class="category-tile-image"><img src="{photos.pack(p)["src"]}" alt="" width="180" height="180" loading="lazy"></span><span><strong>{label}</strong><small>{count} products</small></span></a>')
    return ''.join(cards)


def catalog_page():
    counts = {k:sum(p['category']==k for p in PRODUCTS)+(1 if k=='glass' else 0) for k in CATS}
    filters = '<button type="button" data-category-filter="all" aria-pressed="true" class="is-active"><span>All products</span><small>16</small></button>'
    filters += ''.join(f'<button type="button" data-category-filter="{k}" aria-pressed="false"><span>{v}</span><small>{counts[k]}</small></button>' for k,v in SHORT.items())
    cards = qifor_card()+''.join(card(p) for p in PRODUCTS)
    featured = ''.join(card(BY_SLUG[s]) for s in ['drying-towel','pressure-washer-gun','air-blower','foam-cannon'])
    return head('Car care. Less effort.','Find TorqueBox car-care products by task. Explore photographic galleries, clear usage guides and the next additions to your routine.','shop',page='collection-page')+header()+f'''
<main id="main">
<section class="shell store-hero-grid" aria-label="Discover the TorqueBox collection">
<div class="store-hero-main"><img class="store-hero-photo" src="assets/photography/garage-hero.webp" alt="A graphite sports car in a detailing garage" width="1536" height="1024" fetchpriority="high"><div class="store-hero-shade"></div><div class="store-hero-copy"><span class="store-hero-label">THE TORQUEBOX COLLECTION</span><h1>CAR CARE.<br><em>LESS EFFORT.</em></h1><p>Find your next essential.<br>Make every detail count.</p><a class="store-button orange" href="#collection">Explore all products</a><div class="store-hero-bottom"><span>WASH</span><span>DRY</span><span>FINISH</span></div></div><span class="store-image-credit">Illustrative garage scene</span></div>
<div class="store-hero-promos"><a class="campaign-tile orange-campaign" href="?category=dry#collection" data-category-link="dry"><div><span>THE FINISH STARTS HERE</span><h2>EVERY DROP.<br>TAKEN CARE OF.</h2><strong>Explore drying</strong></div><img src="assets/catalog/drying-towel-1.webp" alt="Twisted-loop drying towel" width="300" height="300"></a><a class="campaign-tile blue-campaign" href="?category=wash#collection" data-category-link="wash"><div><span>GET TO KNOW YOUR GEAR</span><h2>BRING ON<br>THE FOAM.</h2><strong>Explore wash tools</strong></div><img src="assets/catalog/foam-cannon-1.webp" alt="Snow foam cannon" width="300" height="300"></a></div>
</section>
<section class="shell category-section"><div class="store-section-head compact"><h2>What are we caring for today?</h2><a class="store-link" href="#collection">See everything</a></div><div class="category-tile-grid">{category_tiles()}</div></section>
<section class="shell store-section featured-store-section"><div class="store-section-head"><div><span class="store-kicker">MEET THE NEW COLLECTION</span><h2>Tools worth a closer look.</h2></div><a class="store-link" href="#collection">Explore the full collection</a></div><div class="featured-store-grid">{featured}</div></section>
<section class="shell store-qifor-banner"><div><span class="store-live-tag">AVAILABLE NOW</span><h2>A clearer view starts here.</h2><p>Meet QIFOR Wind Shield Pro. Already in the TorqueBox store.</p><a class="store-button dark" href="index.html#purchase-section">Shop QIFOR</a></div><img src="assets/images/qifor-wind-shield-pro.jpg" alt="QIFOR Wind Shield Pro" width="500" height="500" loading="lazy"></section>
<section class="shell store-section store-collection" id="collection"><div class="store-section-head"><div><span class="store-kicker">FIND THE RIGHT CARE</span><h2 id="collection-title">Explore the collection.</h2><p id="collection-description">Choose the job. Discover the product. See how to use it.</p></div><a class="store-link" href="support.html">Help me choose</a></div>
<div class="store-catalog-layout"><aside class="store-filter-panel" aria-label="Product categories"><h3>Shop by category</h3><div class="store-category-filters" role="group" aria-label="Filter by category">{filters}</div><div class="store-filter-help"><strong>New to car care?</strong><p>Every product has a photographic gallery and a clear usage guide.</p><a href="support.html">Ask TorqueBox</a></div></aside>
<div class="store-catalog-results"><div class="store-results-toolbar"><p id="result-count" role="status" aria-live="polite">16 products</p><div><label for="product-sort">Sort by</label><select id="product-sort"><option value="featured">Featured</option><option value="name">Name: A–Z</option><option value="name-desc">Name: Z–A</option></select></div></div><div class="store-active-filter" id="active-filter" hidden><span id="active-filter-label"></span><button type="button" id="clear-category">Clear category</button></div><div class="store-product-grid" id="product-grid">{cards}</div><div class="store-empty" id="empty-results" hidden><h3>Let’s find your next essential.</h3><p>No matches this time. Try another name or explore all products.</p><button class="store-button orange" id="reset-search" type="button">Show all products</button></div><p class="store-preview-note">The new collection is a preview. Final models, prices and delivery details will be confirmed before ordering opens.</p></div></div></section>
<section class="shell store-section care-destinations"><div class="store-section-head"><div><span class="store-kicker">MORE THAN THE PAINT</span><h2>Get into the details.</h2></div></div><div class="care-destination-grid"><a href="?category=interior#collection" data-category-link="interior"><img src="assets/photography/application-interior.webp" alt="Wiping cabin trim with microfiber" width="1100" height="1100" loading="lazy"><div><span>INTERIOR CARE</span><h3>A cabin that feels cared for.</h3><strong>Explore interior care</strong></div></a><a href="?category=wheels#collection" data-category-link="wheels"><img src="assets/photography/application-tire.webp" alt="Applying dressing to a clean tire sidewall" width="1100" height="1100" loading="lazy"><div><span>WHEELS & TIRES</span><h3>Finish at ground level.</h3><strong>Explore wheels & tires</strong></div></a></div></section>
{recent_section()}
<section class="store-support-banner"><div class="shell"><div><span>REAL QUESTIONS. CLEAR ANSWERS.</span><h2>Choose with a little more confidence.</h2><p>Unsure where a product fits? Let’s find the right information.</p></div><a class="store-button orange" href="support.html">Talk to TorqueBox</a></div></section>
</main>{footer()}</body></html>'''


def product_page(p):
    g = p['gallery']; first=g[0]; still=photos.pack(p)
    thumbs = ''.join(f'<button class="photo-thumb {"is-active" if i==0 else ""}" type="button" aria-label="View photo {i+1} of 6: {e(im["alt"])}" aria-pressed="{str(i==0).lower()}" data-photo-index="{i}" data-src="../{im["src"]}" data-alt="{e(im["alt"])}" data-kind="{im["kind"]}" data-origin="{im["origin"]}"><img src="../{im["src"]}" alt="" width="100" height="100" loading="eager" decoding="async"></button>' for i,im in enumerate(g))
    reasons = ''.join(f'<li>{icon("check",19)}<span>{e(r["text"])}</span></li>' for r in p['reasons'])
    specs = ''.join(f'<tr><th scope="row">{e(k)}</th><td>{e(v)}</td></tr>' for k,v in p['specs'])
    faq = ''.join(f'<details><summary>{e(q)}{icon("plus",20)}</summary><p>{e(a)}</p></details>' for q,a in p['faq'])
    related = ''.join(card(BY_SLUG[s],'../') for s in p['related'])
    extra = next((im for im in g[1:] if im['kind']=='application' and im['src']!=first['src']),first)
    schema = {'@context':'https://schema.org','@type':'Product','name':p['title'],'description':p['how'],'image':['https://torque-box.com/'+x['src'] for x in g],'url':'https://torque-box.com/products/'+p['slug']}
    return head(p['title'],p['promise'],'products/'+p['slug'],'../','product-page',p)+header('../')+f'''
<main id="main" style="{theme(p['category'])}"><div class="shell store-product-shell">
<nav class="store-breadcrumb" aria-label="Breadcrumb"><a href="../shop.html?category={p['category']}#collection" data-back-collection>Back to collection</a><span aria-hidden="true">/</span><a href="../shop.html?category={p['category']}#collection">{SHORT[p['category']]}</a><span aria-hidden="true">/</span><span>{e(p['title'])}</span></nav>
<section class="store-product-hero"><div class="store-gallery-column"><div class="store-gallery-heading"><span>{SHORT[p['category']]}</span><strong>SEE IT. KNOW IT.</strong></div><div class="product-gallery" data-gallery><div class="photo-stage" tabindex="0" role="region" aria-label="{e(p['title'])} photo carousel"><img class="main-photo" data-main-photo src="../{first['src']}" alt="{e(first['alt'])}" width="1100" height="1100" fetchpriority="high"><span class="gallery-count" data-photo-count aria-live="polite">01 / 06</span><span class="gallery-origin" data-photo-origin>{'Illustrative application' if first['origin']=='generated' else 'Application reference'}</span><div class="pack-inset" data-pack-inset><img src="../{still['src']}" alt="{e(p['title'])} product packaging" width="150" height="190"></div><div class="photo-arrows"><button type="button" aria-label="Previous photo" data-photo-prev>{icon('left')}</button><button type="button" aria-label="Next photo" data-photo-next>{icon('right')}</button></div></div><div class="photo-thumbs" role="group" aria-label="Six product photographs">{thumbs}</div><p class="gallery-help">Six views to explore. Swipe on mobile or select a photo.</p></div></div>
<div class="store-buybox"><div class="store-buybox-top"><span class="store-category-tag">{SHORT[p['category']]}</span><span class="store-launch-badge">Collection preview</span></div><p class="store-product-name">{e(p['title'])}</p><h1>{e(p['headline'])}</h1><p class="store-product-description">{e(p['how'])}</p><ul class="store-product-benefits">{reasons}</ul><div class="store-product-facts"><div><span>WHEN TO USE</span><strong>{e(p['stage'])}</strong></div><div><span>MADE FOR</span><strong>{e(p['surface'])}</strong></div></div><a class="store-button orange" href="#how-to-use">See how to use it</a><a class="store-button pale" href="../support.html">Ask about this product</a><div class="store-launch-note"><strong>Get to know your next essential.</strong><p>Preview only. Price, final model and delivery details will be confirmed before ordering opens.</p></div><a class="store-link store-back-link" href="../shop.html?category={p['category']}#collection" data-back-collection>Keep exploring {SHORT[p['category']].lower()}</a></div></section>
<nav class="store-product-tabs" aria-label="Product sections"><a href="#in-action" aria-current="location">Why use it</a><a href="#how-to-use">How to use</a><a href="#fit">Where it fits</a><a href="#details">Product details</a><a href="#reviews">Feedback</a></nav>
<section class="store-in-action store-section" id="in-action"><div><span class="store-kicker">THE DIFFERENCE IS IN THE DETAILS</span><h2>{e(p['promise'])}</h2><p class="store-action-lead">{e(p['problem'])}</p><p>{e(p['payoff'])}</p><a class="store-button orange" href="#how-to-use">Find your routine</a></div><figure><img src="../{extra['src']}" alt="{e(extra['alt'])}" width="1100" height="1100" loading="lazy"><figcaption>Application reference</figcaption></figure></section>
<section class="store-how store-section" id="how-to-use"><div class="store-section-head"><div><span class="store-kicker">YOUR PRODUCT. YOUR ROUTINE.</span><h2>A little know-how goes a long way.</h2><p>Preparation, application and the finishing touch.</p></div><span class="store-guide-label">YOUR APPLICATION GUIDE</span></div><ol class="photo-steps">{photos.photo_guide(p)}</ol><div class="method-note"><span>THE DETAIL THAT MATTERS</span><p>{e(p['tip'])}</p></div><p class="store-photo-disclosure">Product photography is combined with illustrative application scenes, including AI-generated images. These explain the routine and do not represent customer results. Follow the supplied label and equipment instructions.</p></section>
<section class="store-fit store-section" id="fit"><div><span class="store-kicker">GOOD CARE STARTS WITH THE RIGHT FIT</span><h2>Know where it belongs.</h2></div><div><span class="store-fit-label">USE IT FOR</span><p>{e(p['suited'])}</p></div><div><span class="store-fit-label">KEEP IN MIND</span><p>{e(p['avoid'])}</p></div></section>
<section class="store-details-grid store-section" id="details"><div class="store-detail-panel"><span class="store-kicker">THE PRODUCT AT A GLANCE</span><h2>Details that matter.</h2><table class="spec-table"><tbody>{specs}</tbody></table><a class="store-link" href="{e(p['primary'])}" target="_blank" rel="noopener noreferrer">Reference product instructions</a></div><div class="store-detail-panel faq"><span class="store-kicker">BEFORE YOU CHOOSE</span><h2>Good questions.</h2>{faq}<details><summary>When can I order this product?{icon('plus',20)}</summary><p>This upcoming product does not have a confirmed price or launch date. TorqueBox will confirm the final item and delivery details before opening orders.</p></details></div></section>
<div class="store-feedback-panel">{photos.reviews(p)}</div>
<section class="store-section store-related"><div class="store-section-head"><div><span class="store-kicker">THE NEXT PART OF YOUR ROUTINE</span><h2>Keep the good care going.</h2></div><a class="store-link" href="../shop.html?category={p['category']}#collection" data-back-collection>Back to the collection</a></div><div class="store-related-grid">{related}</div></section></div>
{recent_section('../')}
<section class="store-support-banner"><div class="shell"><div><span>A LITTLE HELP BEFORE YOU CHOOSE?</span><h2>Let’s talk car care.</h2><p>Get clear information about the product and its use.</p></div><a class="store-button orange" href="../support.html">Contact TorqueBox</a></div></section></main>{footer('../')}<script type="application/ld+json">{json.dumps(schema)}</script></body></html>'''


def main():
    for p in PRODUCTS:
        assert len(p['gallery'])==6 and len({x['src'] for x in p['gallery']})==6
        assert all((ROOT/x['src']).is_file() for x in p['gallery'])
        (ROOT/'products'/(p['slug']+'.html')).write_text(product_page(p))
    (ROOT/'shop.html').write_text(catalog_page())
    print('Rendered the storefront and 15 product pages; six-image galleries preserved. QIFOR unchanged.')


if __name__ == '__main__':
    main()
