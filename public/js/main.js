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

// Termine aus Konzertmeister laden – vergangene Termine werden ausgeblendet
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function loadEvents() {
  const list = document.getElementById('events');
  try {
    // Auftritte kommen ausschließlich aus Konzertmeister (Netlify-Funktion /api/termine)
    const res = await fetch('/api/termine', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const events = await res.json();
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
    addEventSchema(upcoming);
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
// Auftritte für Google als Veranstaltungen kennzeichnen (schema.org/MusicEvent)
function berlinOffset(datum) {
  const d = new Date(datum + 'T12:00:00Z');
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', timeZoneName: 'shortOffset' })
    .formatToParts(d).find((p) => p.type === 'timeZoneName')?.value || 'GMT+1';
  const h = parseInt(name.replace('GMT', ''), 10) || 1;
  return `+0${h}:00`;
}
function addEventSchema(events) {
  const data = events.map((e) => {
    const [von, bis] = String(e.uhrzeit || '').split(/[–-]/).map((t) => t.trim()).filter(Boolean);
    const tz = berlinOffset(e.datum);
    const ev = {
      '@context': 'https://schema.org',
      '@type': 'MusicEvent',
      name: `${e.titel} – Blechpartie`,
      startDate: von ? `${e.datum}T${von}:00${tz}` : e.datum,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: e.ort || e.titel, address: e.ort || e.titel },
      performer: { '@type': 'MusicGroup', '@id': 'https://blechpartie.de/#band', name: 'Blechpartie – Das Original' },
      organizer: { '@type': 'MusicGroup', name: 'Blechpartie – Das Original', url: 'https://blechpartie.de/' },
      image: 'https://blechpartie.de/img/teilen.jpg',
      url: 'https://blechpartie.de/#termine',
    };
    if (bis) ev.endDate = `${e.datum}T${bis}:00${tz}`;
    return ev;
  });
  if (!data.length) return;
  const tag = document.createElement('script');
  tag.type = 'application/ld+json';
  tag.textContent = JSON.stringify(data);
  document.head.appendChild(tag);
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
