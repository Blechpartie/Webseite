// Liefert die Blechpartie-Auftritte aus Konzertmeister: GET /api/termine
// Der private Kalender-Link steht nur in der Netlify-Umgebungsvariable
// KONZERTMEISTER_ICAL_URL und wird nie an Besucher ausgeliefert.
import { blechpartieTermine } from '../lib/konzertmeister.mjs';

export default async () => {
  const url = process.env.KONZERTMEISTER_ICAL_URL;
  let termine = [];
  if (url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      termine = blechpartieTermine(await res.text());
    } catch (err) {
      console.error('Konzertmeister-Abruf fehlgeschlagen:', err.message);
    }
  }
  return Response.json(termine, {
    headers: {
      'cache-control': 'public, max-age=600',
      // Netlify-CDN hält die Antwort eine Stunde vor – spart Funktionsaufrufe
      'netlify-cdn-cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};

export const config = { path: '/api/termine' };
