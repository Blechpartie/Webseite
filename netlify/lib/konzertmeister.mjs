// Liest den iCal-Kalender aus Konzertmeister und gibt nur öffentliche
// Auftritte der Blechpartie zurück (Datum, Uhrzeit, Titel, Ort).
// Beschreibungen, Teilnehmer und Zu-/Absagen werden nie übernommen.

const TZ = 'Europe/Berlin';

// Konzertmeister schreibt die Gruppe in Klammern hinter den Titel, z. B.
// „(+) Festzelt Bietzen (Blechpartie-Das Original)“, und die Terminart in die
// Beschreibung („Auftritt“, „Probe“, „Auftrittsanfrage“, „Sonstiges“ …).
// Übernommen werden nur Termine dieser Gruppe mit einer dieser Terminarten.
const FILTER = (process.env.KONZERTMEISTER_FILTER || 'Blechpartie').toLowerCase();
const TYPEN = (process.env.KONZERTMEISTER_TYPEN || 'Auftritt').split(',').map((t) => t.trim().toLowerCase());

function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function unescape(v) {
  return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

export function parseIcs(text) {
  const events = [];
  let cur = null;
  for (const line of unfold(text).split('\n')) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(';');
    const p = Object.fromEntries(params.map((x) => x.split('=')));
    cur[name.toUpperCase()] = { value: line.slice(i + 1), params: p };
  }
  return events;
}

// Liefert ein Date-Objekt für DTSTART/DTEND (UTC, TZID oder ganztägig)
function toDate(prop) {
  if (!prop) return null;
  const m = prop.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00', z] = m;
  if (z) return { date: new Date(Date.UTC(+y, mo - 1, +d, +h, +mi, +s)), allDay: false };
  if (!m[4]) return { local: { y, mo, d }, allDay: true };
  // Lokale Zeit (TZID oder ohne Angabe) wird als Europe/Berlin behandelt
  return { local: { y, mo, d, h, mi }, allDay: false };
}

const fmt = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function parts(t) {
  if (!t) return null;
  if (t.local) return { datum: `${t.local.y}-${t.local.mo}-${t.local.d}`, zeit: t.allDay ? '' : `${t.local.h}:${t.local.mi}` };
  const o = Object.fromEntries(fmt.formatToParts(t.date).map((x) => [x.type, x.value]));
  return { datum: `${o.year}-${o.month}-${o.day}`, zeit: `${o.hour}:${o.minute}` };
}

function cleanTitle(s) {
  return s
    // Zusage-Markierung „(+)“, „(-)“, „(?)“ und „Vorgemerkt:“ entfernen
    .replace(/^\([+\-?]\)\s*/, '')
    .replace(/^vorgemerkt\s*:\s*/i, '')
    .replace(/^(auftritt|konzert|termin)\s*[:\-–]\s*/i, '')
    // Gruppenname in Klammern am Ende entfernen, z. B. „Festzelt Bietzen (Blechpartie-Das Original)“
    .replace(/\s*\([^()]*\)\s*$/, '')
    .replace(/\s*[-–]\s*blechpartie.*$/i, '')
    .replace(/^blechpartie\s*[:\-–]\s*/i, '')
    .trim();
}

export function blechpartieTermine(icsText) {
  return parseIcs(icsText)
    .filter((e) => {
      if (e.STATUS && /CANCELLED/i.test(e.STATUS.value)) return false;
      const summary = e.SUMMARY ? unescape(e.SUMMARY.value) : '';
      const gruppe = (summary.match(/\(([^()]*)\)\s*$/) || [])[1] || '';
      if (!gruppe.toLowerCase().includes(FILTER)) return false;
      // Terminart = erstes Wort der Beschreibung („Auftritt - Details …“)
      const art = (e.DESCRIPTION ? unescape(e.DESCRIPTION.value) : '').split(/\s+-\s+|\n/)[0].trim().toLowerCase();
      return TYPEN.includes(art);
    })
    .map((e) => {
      const start = parts(toDate(e.DTSTART));
      const end = parts(toDate(e.DTEND));
      if (!start) return null;
      const uhrzeit = start.zeit && end?.zeit && end.datum === start.datum && end.zeit !== start.zeit
        ? `${start.zeit}–${end.zeit}` : start.zeit;
      const titel = cleanTitle(unescape(e.SUMMARY.value));
      const ort = e.LOCATION ? unescape(e.LOCATION.value).split(',').slice(0, 2).join(',').trim() : '';
      // Ort nicht wiederholen, wenn er schon im Titel steht (z. B. „Festzelt Bietzen“)
      return { datum: start.datum, uhrzeit, titel, ort: ort && titel.toLowerCase().includes(ort.toLowerCase()) ? '' : ort };
    })
    .filter(Boolean);
}
