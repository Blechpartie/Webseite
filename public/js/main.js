// Mobiles Menü
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
});
nav.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});

document.getElementById('year').textContent = new Date().getFullYear();

// Besetzung: durchwischbar, am Desktop zusätzlich mit Pfeilen
const members = document.getElementById('members');
if (members) {
  const prev = document.querySelector('.members-prev');
  const next = document.querySelector('.members-next');
  const step = () => members.querySelector('.member').offsetWidth + 16;
  const update = () => {
    prev.disabled = members.scrollLeft <= 2;
    next.disabled = members.scrollLeft + members.clientWidth >= members.scrollWidth - 2;
  };
  prev.addEventListener('click', () => members.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => members.scrollBy({ left: step(), behavior: 'smooth' }));
  members.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

// Termine laden – vergangene Termine werden ausgeblendet
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function loadEvents() {
  const list = document.getElementById('events');
  try {
    // Eigene Termine (data/termine.json) + Auftritte aus Konzertmeister (/api/termine)
    const load = (url) => fetch(url, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
    const [own, km] = await Promise.all([load('data/termine.json'), load('/api/termine')]);
    // Eigene Einträge haben Vorrang: Konzertmeister-Termine am selben Tag werden nicht doppelt gezeigt
    const ownDays = new Set(own.map((e) => e.datum));
    const events = [...own, ...km.filter((e) => !ownDays.has(e.datum))];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = events
      .map((e) => ({ ...e, d: new Date(e.datum + 'T00:00:00') }))
      .filter((e) => e.d >= today)
      .sort((a, b) => a.d - b.d);

    if (!upcoming.length) {
      list.innerHTML = '<li class="events-empty">Aktuell stehen keine öffentlichen Termine fest – schaut bald wieder vorbei oder folgt uns auf Instagram.</li>';
      return;
    }
    list.innerHTML = upcoming.map((e) => {
      const month = e.d.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '');
      const weekday = e.d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '');
      const details = [e.uhrzeit && `${escapeHtml(e.uhrzeit)} Uhr`, escapeHtml(e.ort)].filter(Boolean).join(' · ');
      const link = e.link ? ` · <a href="${escapeHtml(e.link)}" target="_blank" rel="noopener">Mehr Infos</a>` : '';
      return `<li class="event">
        <div class="event-date"><span class="day">${e.d.getDate()}</span><span class="month">${month}</span><span class="weekday">${weekday}</span></div>
        <div><h3>${escapeHtml(e.titel)}</h3><p>${details}${link}</p></div>
      </li>`;
    }).join('');
  } catch (err) {
    list.innerHTML = '<li class="events-empty">Die Termine konnten nicht geladen werden.</li>';
  }
}
loadEvents();

// YouTube erst nach Klick laden (Datenschutz). Videos ohne ID werden ausgeblendet.
const videos = document.querySelectorAll('.video');
let hasVideo = false;
videos.forEach((v) => {
  const id = v.dataset.youtube;
  if (!id) { v.remove(); return; }
  hasVideo = true;
  v.querySelector('.video-consent').addEventListener('click', () => {
    v.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1" title="Video der Blechpartie" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  });
});
const videosEmpty = document.querySelector('.videos-empty');
if (hasVideo && videosEmpty) videosEmpty.remove();
if (!hasVideo) document.querySelector('.videos')?.remove();

// Instagram-Beiträge (von der Netlify-Funktion zwischengespeichert)
async function loadInstagram() {
  const grid = document.getElementById('insta-grid');
  if (!grid) return;
  try {
    const res = await fetch('/api/instagram');
    if (!res.ok) return;
    const { posts = [] } = await res.json();
    if (!posts.length) return;
    grid.innerHTML = posts.slice(0, 9).map((p) => {
      const alt = escapeHtml((p.caption || 'Instagram-Beitrag der Blechpartie').split('\n')[0].slice(0, 120));
      const badge = p.type === 'VIDEO' ? '<span class="insta-badge" aria-hidden="true">▶</span>'
        : p.type === 'CAROUSEL_ALBUM' ? '<span class="insta-badge" aria-hidden="true">❐</span>' : '';
      return `<a class="insta-post" href="${escapeHtml(p.permalink)}" target="_blank" rel="noopener">
        <img src="/api/instagram/img/${encodeURIComponent(p.id)}" alt="${alt}" loading="lazy">${badge}
      </a>`;
    }).join('');
    grid.hidden = false;
  } catch (err) {
    // Ohne Feed bleibt nur der Link zu Instagram sichtbar
  }
}
loadInstagram();

// Galerie: Antippen öffnet eine Diashow, durch die man wischen kann
const galleryLinks = [...document.querySelectorAll('.gallery a')];
function openSlideshow(startIndex) {
  const show = document.createElement('div');
  show.className = 'slideshow';
  show.setAttribute('role', 'dialog');
  show.setAttribute('aria-modal', 'true');
  show.setAttribute('aria-label', 'Bildergalerie');
  show.innerHTML = `
    <button class="ss-btn ss-close" type="button" aria-label="Schließen">✕</button>
    <button class="ss-btn ss-prev" type="button" aria-label="Vorheriges Bild">‹</button>
    <button class="ss-btn ss-next" type="button" aria-label="Nächstes Bild">›</button>
    <div class="ss-counter" aria-live="polite"></div>
    <div class="ss-track">${galleryLinks.map((a, i) => `
      <figure class="ss-slide"><img src="${a.getAttribute('href')}" alt="${escapeHtml(a.querySelector('img').alt)}" ${Math.abs(i - startIndex) > 1 ? 'loading="lazy"' : ''}></figure>`).join('')}
    </div>`;
  const track = show.querySelector('.ss-track');
  const counter = show.querySelector('.ss-counter');
  const current = () => Math.round(track.scrollLeft / track.clientWidth);
  const update = () => { counter.textContent = `${current() + 1} / ${galleryLinks.length}`; };
  const go = (i) => track.scrollTo({ left: Math.max(0, Math.min(i, galleryLinks.length - 1)) * track.clientWidth, behavior: 'smooth' });
  const close = () => {
    show.remove();
    document.body.classList.remove('ss-open');
    document.removeEventListener('keydown', onKey);
    galleryLinks[current()]?.focus();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') go(current() + 1);
    if (e.key === 'ArrowLeft') go(current() - 1);
  };
  show.querySelector('.ss-close').addEventListener('click', close);
  show.querySelector('.ss-prev').addEventListener('click', () => go(current() - 1));
  show.querySelector('.ss-next').addEventListener('click', () => go(current() + 1));
  // Tippen neben das Bild schließt die Diashow
  track.addEventListener('click', (e) => { if (e.target.classList.contains('ss-slide')) close(); });
  track.addEventListener('scroll', update, { passive: true });
  document.addEventListener('keydown', onKey);
  document.body.classList.add('ss-open');
  document.body.appendChild(show);
  track.scrollLeft = startIndex * track.clientWidth;
  update();
  show.querySelector('.ss-close').focus();
}
galleryLinks.forEach((a, i) => a.addEventListener('click', (e) => { e.preventDefault(); openSlideshow(i); }));
