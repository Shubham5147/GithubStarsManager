import { Router, type Request, type Response, type NextFunction } from 'express';
import { getDb } from '../db/connection.js';
import { indexEntityForSearch } from '../db/secondBrainSchema.js';

const router = Router();

function parseJson<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

// GET /api/inbox — reels with pending link suggestions
router.get('/api/inbox', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `
      SELECT p.id, p.caption, p.is_video, p.local_thumb_path, p.local_video_path, p.synced_at,
             l.id as link_id, l.repo_full_name, l.status as link_status,
             e.confidence, e.source as extraction_source, e.evidence
      FROM instagram_posts p
      LEFT JOIN links l ON l.post_id = p.id AND l.status = 'suggested'
      LEFT JOIN extractions e ON e.post_id = p.id
      WHERE p.is_video = 1
      ORDER BY p.synced_at DESC
      LIMIT 200
    `,
      )
      .all();
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/api/links/:id/confirm', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { id } = req.params;
    db.prepare(`UPDATE links SET status = 'confirmed' WHERE id = ?`).run(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/api/links/:id/reject', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { id } = req.params;
    db.prepare(`UPDATE links SET status = 'rejected' WHERE id = ?`).run(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/api/repos/:owner/:repo/images', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const fullName = `${req.params.owner}/${req.params.repo}`;
    const images = db
      .prepare(
        `SELECT image_url, sort_order, cached_path FROM repo_readme_images
         WHERE repo_full_name = ? ORDER BY sort_order`,
      )
      .all(fullName);
    res.json({ full_name: fullName, images });
  } catch (err) {
    next(err);
  }
});

router.get('/api/papers', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const topic = req.query.topic as string | undefined;
    let rows = db
      .prepare(`SELECT * FROM research_papers ORDER BY published_at DESC LIMIT 500`)
      .all() as Array<Record<string, unknown>>;

    if (topic) {
      rows = rows.filter((r) => {
        const topics = parseJson<string[]>(r.topics as string, []);
        return topics.includes(topic);
      });
    }
    res.json({
      items: rows.map((r) => ({
        ...r,
        authors: parseJson(r.authors as string, []),
        topics: parseJson(r.topics as string, []),
        code_repos: parseJson(r.code_repos as string, []),
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/api/papers/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const row = db
      .prepare(`SELECT * FROM research_papers WHERE id = ?`)
      .get(req.params.id) as Record<string, unknown> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({
      ...row,
      authors: parseJson(row.authors as string, []),
      topics: parseJson(row.topics as string, []),
      code_repos: parseJson(row.code_repos as string, []),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/api/papers/add', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const { id, title, abstract, authors, source, source_url, topics } = req.body;
    if (!id || !title) {
      res.status(400).json({ error: 'id and title required' });
      return;
    }
    db.prepare(
      `INSERT OR REPLACE INTO research_papers
       (id, title, abstract, authors, source, source_url, topics, trust_score, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1.0, datetime('now'))`,
    ).run(
      id,
      title,
      abstract ?? '',
      JSON.stringify(authors ?? []),
      source ?? 'manual',
      source_url ?? '',
      JSON.stringify(topics ?? []),
    );
    indexEntityForSearch(db, 'paper', id, title, abstract ?? '');
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
});

router.post('/api/papers/feeds/run', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    message: 'Run: make sync-papers (research_sync CLI)',
  });
});

router.get('/api/search', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      res.json({ results: [] });
      return;
    }
    const rows = db
      .prepare(
        `SELECT entity_type, entity_id, title, snippet(brain_search, 2, '<b>', '</b>', '...', 32) as snippet
         FROM brain_search WHERE brain_search MATCH ?
         ORDER BY rank LIMIT 50`,
      )
      .all(q.replace(/[^\w\s]/g, ' '));
    res.json({ results: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/api/repos/:owner/:repo/related', (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const fullName = `${req.params.owner}/${req.params.repo}`;
    const reelLinks = db
      .prepare(
        `SELECT p.id, p.caption, l.status FROM links l
         JOIN instagram_posts p ON p.id = l.post_id
         WHERE l.repo_full_name = ? AND l.status = 'confirmed'`,
      )
      .all(fullName);
    const paperLinks = db
      .prepare(
        `SELECT pl.paper_id, rp.title FROM paper_links pl
         JOIN research_papers rp ON rp.id = pl.paper_id
         WHERE pl.target_type = 'github_repo' AND pl.target_id = ? AND pl.status = 'confirmed'`,
      )
      .all(fullName);
    res.json({ reels: reelLinks, papers: paperLinks });
  } catch (err) {
    next(err);
  }
});

export default router;
