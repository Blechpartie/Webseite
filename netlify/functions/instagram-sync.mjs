// Läuft stündlich und aktualisiert den Instagram-Feed.
import { syncInstagram } from '../lib/instagram.mjs';

export default async () => {
  try {
    const feed = await syncInstagram();
    console.log(`Instagram: ${feed.posts.length} Beiträge aktualisiert`);
  } catch (err) {
    console.error('Instagram-Sync fehlgeschlagen:', err.message);
  }
};

export const config = { schedule: '@hourly' };
