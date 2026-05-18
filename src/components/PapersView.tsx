import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { addPaper, fetchPapers, type PaperItem } from '../services/secondBrainApi';
import { backend } from '../services/backendAdapter';
import { useAppStore } from '../store/useAppStore';

const TOPICS = [
  { id: '', label: 'All' },
  { id: 'uav', label: 'UAV & Drones' },
  { id: 'aerospace_ai', label: 'Aerospace AI' },
  { id: 'open_robotics', label: 'Open Robotics' },
  { id: 'quantum_robotics_ai', label: 'Quantum × Robotics' },
];

export const PapersView: React.FC = () => {
  const [papers, setPapers] = useState<PaperItem[]>([]);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addId, setAddId] = useState('');
  const backendApiSecret = useAppStore((s) => s.backendApiSecret);

  const load = useCallback(async () => {
    if (!backend.isAvailable) {
      setError('Connect backend in Settings');
      setLoading(false);
      return;
    }
    try {
      setPapers(await fetchPapers(topic || undefined));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load papers');
    } finally {
      setLoading(false);
    }
  }, [topic, backendApiSecret]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7" />
            Research Papers
          </h2>
          <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">
            Trusted sources: arXiv, OpenAlex, Papers with Code, and more.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="arXiv URL or DOI"
            className="px-3 py-2 rounded-lg border dark:bg-surface-dark text-sm"
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
          />
          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm"
            onClick={async () => {
              if (!addId.trim()) return;
              await addPaper({
                id: addId.includes('arxiv') ? `arxiv:${addId.split('/').pop()}` : addId,
                title: addId,
                source_url: addId,
              });
              setAddId('');
              load();
            }}
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTopic(t.id)}
            className={`px-3 py-1 rounded-full text-sm ${
              topic === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="animate-pulse">Loading…</p>}
      {error && <p className="text-amber-600 text-sm">{error}</p>}

      <ul className="space-y-4">
        {papers.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-gray-200 dark:border-border-dark p-4 bg-white dark:bg-surface-dark"
          >
            <a
              href={p.source_url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {p.title}
            </a>
            <p className="text-xs text-gray-500 mt-1">
              {p.source} · {p.published_at?.slice(0, 10) ?? '—'} ·{' '}
              {p.topics?.join(', ')}
            </p>
            <p className="text-sm mt-2 line-clamp-3">{p.abstract}</p>
            {p.code_repos?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.code_repos.map((r) => (
                  <a
                    key={r.url}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
                  >
                    {r.url.replace('https://github.com/', '')}
                    {r.is_official ? ' ★' : ''}
                  </a>
                ))}
              </div>
            )}
            {p.pdf_url && (
              <a
                href={p.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 text-sm text-green-600"
              >
                Open PDF
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
