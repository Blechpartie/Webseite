// Liefert den zwischengespeicherten Instagram-Feed und die Bilder aus.
//   GET /api/instagram          -> { updatedAt, posts: [...] }
//   GET /api/instagram/img/:id  -> Bild
import { store, syncInstagram } from '../lib/instagram.mjs';

export default async (req, context) => {
  const s = store();
  const { id } = context.params;

  if (id) {
    const blob = await s.getWithMetadata(`img/${id}`, { type: 'arrayBuffer' });
    if (!blob) return new Response('Not found', { status: 404 });
    return new Response(blob.data, {
      headers: {
        'content-type': blob.metadata.contentType || 'image/jpeg',
        'cache-control': 'public, max-age=86400',
      },
    });
  }

  let feed = await s.get('feed', { type: 'json' });
  if (!feed) {
    // Erster Aufruf nach dem Deploy: einmal direkt synchronisieren
    try {
      feed = await syncInstagram();
    } catch (err) {
      console.error('Instagram-Sync fehlgeschlagen:', err.message);
      feed = { updatedAt: null, posts: [] };
    }
  }
  return Response.json(feed, { headers: { 'cache-control': 'public, max-age=600' } });
};

export const config = { path: ['/api/instagram', '/api/instagram/img/:id'] };
