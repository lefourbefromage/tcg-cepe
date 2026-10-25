// Éditeur local des titres de cartes — node outils/titres/server.mjs
// Aucune dépendance. Ouvre http://localhost:4321
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');            // dossier tcg-cepe
const JSON_PATH = path.join(ROOT, 'cartes', 'cartes.json');
const PORT = Number(process.env.PORT) || 4321;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

async function readCards() { return JSON.parse(await fs.readFile(JSON_PATH, 'utf8')); }
async function writeCards(cards) {
  const tmp = JSON_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(cards, null, 1) + '\n', 'utf8');
  await fs.rename(tmp, JSON_PATH);
}
// Sauvegarde de sécurité une seule fois au démarrage
try { await fs.copyFile(JSON_PATH, JSON_PATH.replace(/\.json$/, '.backup.json'), fs.constants.COPYFILE_EXCL); } catch {}

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body);
}
function safe(p) { const f = path.resolve(ROOT, '.' + p); return f.startsWith(ROOT) ? f : null; }

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/cartes' && req.method === 'GET') return send(res, 200, JSON.stringify(await readCards()));
    if (url.pathname.startsWith('/api/cartes/') && req.method === 'PUT') {
      const num = url.pathname.split('/').pop();
      let body = ''; for await (const c of req) body += c;
      const { title } = JSON.parse(body || '{}');
      const cards = await readCards();
      const card = cards.find(c => c.num === num);
      if (!card) return send(res, 404, '{"error":"carte inconnue"}');
      card.title = String(title ?? '').trim().slice(0, 40);
      await writeCards(cards);
      return send(res, 200, JSON.stringify(card));
    }
    let p = url.pathname === '/' ? '/outils/titres/index.html' : decodeURIComponent(url.pathname);
    const f = safe(p); if (!f) return send(res, 403, 'interdit', 'text/plain');
    const data = await fs.readFile(f);
    send(res, 200, data, TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream');
  } catch (e) { send(res, e.code === 'ENOENT' ? 404 : 500, String(e.message), 'text/plain'); }
}).listen(PORT, '127.0.0.1', () => console.log(`Éditeur de titres : http://localhost:${PORT}  (Ctrl+C pour quitter)`));
