(() => {
  const byId = (id) => document.getElementById(id);
  const form = byId('customer-review-form');
  const toggle = byId('write-review-toggle');
  const list = byId('reviews-list');
  const carousel = byId('checkout-feedback-slides');
  const status = byId('review-form-status');
  const preview = byId('review-photo-preview');
  const upload = byId('review-photos');
  const loadMore = byId('review-load-more');
  if (!form || !toggle || !list || !carousel || !status || !upload || !preview) return;

  const sessionKey = 'torquebox:verified-checkout-session';
  const reviewsById = new Map();
  let nextCursor = null;
  let totalPublished = 0;
  let loadedFirstPage = false;
  let busy = false;
  let selectedStars = 5;

  function getVerifiedSession() {
    try { return localStorage.getItem(sessionKey) || ''; } catch { return ''; }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function appendPhoto(target, url, className) {
    // Only same-origin API paths, never arbitrary user-provided URLs.
    if (!/^\/api\/reviews\/image\/[a-f0-9-]{36}$/i.test(url)) return;
    const img = element('img', className);
    img.src = url;
    img.alt = 'Photo uploaded with this customer review';
    img.loading = 'lazy';
    img.decoding = 'async';
    target.append(img);
  }

  function reviewCard(review) {
    const card = element('article', 'review-card bg-white p-space-md rounded-xl shadow-sm flex flex-col justify-between gap-space-md border border-[#e4e5e8]');
    card.dataset.category = review.category;
    card.dataset.dynamicReview = review.id;
    const top = element('div', 'flex flex-col gap-3');
    const heading = element('div', 'flex flex-wrap items-center justify-between gap-2');
    const stars = element('span', 'text-[#f58a00] tracking-widest text-lg', '★'.repeat(review.rating));
    stars.setAttribute('aria-label', `${review.rating} out of 5 stars`);
    const verified = element('span', 'text-[11px] font-bold text-[#25815b] bg-[#e8f7ee] px-2 py-1 rounded-full', '✓ Verified buyer');
    heading.append(stars, verified);
    const quote = element('blockquote', 'font-body-md text-body-md text-on-surface-variant leading-relaxed', `“${review.body}”`);
    top.append(heading, quote);
    if (review.photos?.length) {
      const photos = element('div', 'grid grid-cols-2 gap-2');
      for (const url of review.photos) appendPhoto(photos, url, 'w-full aspect-[4/3] rounded-lg object-cover border border-[#e6e6e6]');
      top.append(photos);
    }
    const person = element('div', 'flex items-center gap-3 pt-1');
    const initials = review.name.split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase() || '').join('');
    const avatar = element('span', 'w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-black bg-[#ffecda] text-[#cf6200]', initials);
    avatar.setAttribute('aria-hidden', 'true');
    const info = element('div', 'min-w-0');
    info.append(element('p', 'font-label-md text-label-md text-primary font-bold', review.name));
    info.append(element('p', 'text-xs text-[#77808c]', new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })));
    person.append(avatar, info);
    card.append(top, person);
    return card;
  }

  function checkoutSlide(review) {
    const slide = element('div', 'checkout-feedback-slide hidden flex-col gap-space-xs');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.dataset.dynamicReview = review.id;
    const row = element('div', 'flex items-start gap-space-sm');
    const initials = review.name.split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase() || '').join('');
    const avatar = element('div', 'w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-[#ffecda] text-[#cf6200] font-bold', initials);
    avatar.setAttribute('aria-hidden', 'true');
    const content = element('div', 'flex-1 min-w-0');
    content.append(element('p', 'font-body-sm text-body-sm text-on-surface leading-relaxed', review.body));
    const meta = element('div', 'flex flex-wrap items-center gap-2 mt-1.5');
    meta.append(element('span', 'font-label-md text-label-md text-on-surface-variant font-semibold', review.name));
    const stars = element('span', 'text-secondary-container tracking-widest', '★'.repeat(review.rating));
    stars.setAttribute('aria-label', `${review.rating} out of 5 stars`);
    meta.append(stars);
    const verified = element('span', 'text-[10px] font-bold text-[#25815b]', '✓ Verified buyer');
    meta.append(verified);
    content.append(meta);
    if (review.photos?.length) {
      const photos = element('div', 'flex gap-2 mt-2');
      for (const url of review.photos) appendPhoto(photos, url, 'w-16 h-12 rounded-md object-cover border border-black/10');
      content.append(photos);
    }
    row.append(avatar, content);
    slide.append(row);
    return slide;
  }

  function updateCounts() {
    const cards = Array.from(list.querySelectorAll('.review-card'));
    for (const button of document.querySelectorAll('.review-filter-btn')) {
      const tag = button.dataset.tag;
      const count = cards.filter(card => tag === 'all' || card.dataset.category === tag).length;
      const name = button.dataset.label || button.textContent.replace(/\s*\(\d+\)\s*$/, '').trim();
      button.dataset.label = name;
      button.textContent = `${name} (${tag === 'all' ? 6 + totalPublished : count})`;
    }
    const allLink = document.querySelector('#checkout-feedback a[href="#reviews"]');
    if (allLink) allLink.textContent = `See all ${6 + totalPublished}`;
    const selected = document.querySelector('.review-filter-btn.bg-primary');
    selected?.click();
  }

  function showReviews(reviews) {
    let added = false;
    // Insert new user reviews without modifying any of the original six reviews.
    for (const review of reviews) {
      if (reviewsById.has(review.id)) continue;
      reviewsById.set(review.id, review);
      list.append(reviewCard(review));
      carousel.append(checkoutSlide(review));
      added = true;
    }
    if (added) window.torqueBoxRefreshFeedback?.();
    updateCounts();
  }

  async function fetchReviews(cursor = null) {
    const url = new URL('/api/reviews', location.origin);
    url.searchParams.set('limit', '40');
    if (cursor) url.searchParams.set('before', cursor);
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load the latest reviews.');
    const payload = await response.json();
    totalPublished = payload.total || 0;
    showReviews(payload.reviews || []);
    if (cursor || !loadedFirstPage) nextCursor = payload.nextCursor;
    loadedFirstPage = true;
    if (loadMore) loadMore.classList.toggle('hidden', !nextCursor);
  }

  toggle.addEventListener('click', () => {
    const open = form.classList.toggle('hidden') === false;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      status.textContent = getVerifiedSession() ? 'Your confirmed purchase is ready for a review.'
        : 'After a verified purchase, return here in the same browser to share your experience.';
      byId('review-name')?.focus();
    }
  });

  const ratingButtons = Array.from(document.querySelectorAll('[data-review-rating]'));
  function setStars(value) {
    selectedStars = value;
    byId('review-rating').value = String(value);
    for (const button of ratingButtons) {
      const active = Number(button.dataset.reviewRating) <= value;
      button.classList.toggle('text-[#fb8a00]', active);
      button.classList.toggle('text-[#c8cdd2]', !active);
      button.setAttribute('aria-pressed', String(Number(button.dataset.reviewRating) === value));
    }
  }
  ratingButtons.forEach(button => button.addEventListener('click', () => setStars(Number(button.dataset.reviewRating))));
  setStars(selectedStars);

  const objectUrls = [];
  function clearPreview() {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls.length = 0;
    preview.replaceChildren();
  }
  upload.addEventListener('change', () => {
    clearPreview();
    const selected = Array.from(upload.files || []);
    if (selected.length > 2) {
      status.textContent = 'Please select at most two photos.';
      upload.value = '';
      return;
    }
    for (const file of selected) {
      const url = URL.createObjectURL(file);
      objectUrls.push(url);
    }
    // Local blob URLs are previews, not review API paths.
    preview.replaceChildren(...selected.map((file, index) => {
      const img = element('img', 'w-20 h-20 rounded-lg border border-[#ddd] object-cover');
      img.src = objectUrls[index];
      img.alt = `Selected photo ${index + 1}`;
      return img;
    }));
    status.textContent = selected.length ? `${selected.length} photo(s) selected.` : '';
  });

  async function optimizePhoto(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 15_000_000) {
      throw new Error('Choose a JPEG, PNG or WebP photo smaller than 15 MB.');
    }
    const image = await createImageBitmap(file);
    try {
      for (const side of [850, 700, 550, 420]) {
        const ratio = Math.min(1, side / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const result = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.75));
        if (result?.type === 'image/webp' && result.size <= 260_000) {
          return new File([result], 'review-photo.webp', { type: 'image/webp' });
        }
      }
    } finally { image.close?.(); }
    throw new Error('This photo could not be optimized. Please choose a smaller image.');
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const sessionId = getVerifiedSession();
    if (!sessionId) {
      status.textContent = 'Only confirmed TorqueBox customers can publish reviews. Please complete checkout first.';
      return;
    }
    busy = true;
    const submit = byId('submit-customer-review');
    submit.disabled = true;
    status.textContent = 'Preparing your review and photos…';
    try {
      const data = new FormData(form);
      data.set('sessionId', sessionId);
      data.set('rating', String(selectedStars));
      data.delete('photos');
      const photos = Array.from(upload.files || []);
      if (photos.length > 2) throw new Error('Choose no more than two photos.');
      for (const photo of photos) data.append('photos', await optimizePhoto(photo));
      const response = await fetch('/api/reviews', { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not submit your review.');
      form.reset();
      clearPreview();
      setStars(5);
      status.textContent = 'Thank you! Your review is now published below.';
      await fetchReviews();
      const card = list.querySelector(`[data-dynamic-review="${result.review.id}"]`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      status.textContent = error.message || 'Your review could not be submitted.';
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });

  loadMore?.addEventListener('click', async () => {
    if (!nextCursor) return;
    loadMore.disabled = true;
    try { await fetchReviews(nextCursor); }
    catch { status.textContent = 'Could not load more reviews. Please try again.'; }
    finally { loadMore.disabled = false; }
  });

  fetchReviews().catch(() => {
    status.textContent = 'Live reviews are temporarily unavailable. Existing customer feedback remains visible.';
  });
  // A page left open shows new reviews automatically, without a reload.
  window.setInterval(() => {
    if (document.visibilityState === 'visible') fetchReviews().catch(() => {});
  }, 60_000);
})();
