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

// Termine aus data/termine.json laden – vergangene Termine werden ausgeblendet
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function loadEvents() {
  const list = document.getElementById('events');
  try {
    const res = await fetch('data/termine.json', { cache: 'no-cache' });
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

// Einfache Lightbox für die Galerie
document.querySelectorAll('.gallery a').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Bild vergrößert – zum Schließen klicken');
    box.innerHTML = `<img src="${a.getAttribute('href')}" alt="${a.querySelector('img').alt}">`;
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (ev) => { if (ev.key === 'Escape') close(); };
    box.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box);
  });
});
