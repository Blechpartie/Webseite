// Holt die neuesten Instagram-Beiträge über die offizielle Instagram-API
// und legt Beitragsdaten und Bilder in Netlify Blobs ab. Besucher der
// Webseite laden dadurch nichts direkt von Instagram/Meta.
import { getStore } from '@netlify/blobs';

const API = 'https://graph.instagram.com';
const LIMIT = 9;
// Langzeit-Tokens gelten 60 Tage; wir erneuern nach 30 Tagen.
const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export const store = () => getStore('instagram');

async function getToken(s) {
  const envToken = process.env.INSTAGRAM_TOKEN;
  if (!envToken) throw new Error('INSTAGRAM_TOKEN ist nicht gesetzt');
  const saved = await s.get('token', { type: 'json' });
  // Erneuerten Token nur nutzen, solange in Netlify kein neuer hinterlegt wurde
  if (saved?.token && saved.source === envToken) return saved;
  return { token: envToken, source: envToken, refreshedAt: 0 };
}

async function refreshTokenIfDue(s, current) {
  if (Date.now() - current.refreshedAt < REFRESH_AFTER_MS) return current.token;
  const res = await fetch(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(current.token)}`);
  if (!res.ok) {
    console.warn('Token-Erneuerung fehlgeschlagen:', res.status, await res.text());
    return current.token;
  }
  const { access_token } = await res.json();
  await s.setJSON('token', { token: access_token, source: current.source, refreshedAt: Date.now() });
  return access_token;
}

export async function syncInstagram(s = store()) {
  const token = await refreshTokenIfDue(s, await getToken(s));

  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const res = await fetch(`${API}/me/media?fields=${fields}&limit=${LIMIT}&access_token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(`Instagram-API: ${res.status} ${await res.text()}`);
  const { data = [] } = await res.json();

  const posts = [];
  for (const m of data) {
    const src = m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url;
    if (!src) continue;
    const key = `img/${m.id}`;
    if (!(await s.getMetadata(key))) {
      const img = await fetch(src);
      if (!img.ok) continue;
      await s.set(key, await img.arrayBuffer(), {
        metadata: { contentType: img.headers.get('content-type') || 'image/jpeg' },
      });
    }
    posts.push({
      id: m.id,
      caption: (m.caption || '').slice(0, 300),
      permalink: m.permalink,
      timestamp: m.timestamp,
      type: m.media_type,
    });
  }

  // Bilder von Beiträgen löschen, die nicht mehr im Feed sind
  const keep = new Set(posts.map((p) => `img/${p.id}`));
  const { blobs } = await s.list({ prefix: 'img/' });
  await Promise.all(blobs.filter((b) => !keep.has(b.key)).map((b) => s.delete(b.key)));

  const feed = { updatedAt: new Date().toISOString(), posts };
  await s.setJSON('feed', feed);
  return feed;
}
