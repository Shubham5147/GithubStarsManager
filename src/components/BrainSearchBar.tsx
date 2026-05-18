import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { searchBrain } from '../services/secondBrainApi';
import { backend } from '../services/backendAdapter';

export const BrainSearchBar: React.FC = () => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<
    Array<{ entity_type: string; entity_id: string; title: string; snippet: string }>
  >([]);

  const run = async () => {
    if (!backend.isAvailable || !q.trim()) return;
    setResults(await searchBrain(q));
  };

  return (
    <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-border-dark bg-white/50 dark:bg-surface-dark/50">
      <div className="flex gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="Search repos, papers, reels…"
          className="flex-1 px-3 py-2 rounded-lg border dark:bg-marketing-black text-sm"
        />
        <button
          type="button"
          onClick={run}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white flex items-center gap-1"
        >
          <Search className="w-4 h-4" /> Search
        </button>
      </div>
      {results.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm max-h-48 overflow-auto">
          {results.map((r, i) => (
            <li key={i} className="border-t pt-2 dark:border-gray-700">
              <span className="text-xs uppercase text-gray-500">{r.entity_type}</span>
              <p className="font-medium">{r.title || r.entity_id}</p>
              <p
                className="text-gray-600 dark:text-gray-400 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: r.snippet || '' }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
