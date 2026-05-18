import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, Film } from 'lucide-react';
import {
  fetchInbox,
  confirmLink,
  rejectLink,
  type InboxItem,
} from '../services/secondBrainApi';
import { backend } from '../services/backendAdapter';
import { useAppStore } from '../store/useAppStore';

export const InboxView: React.FC = () => {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const backendApiSecret = useAppStore((s) => s.backendApiSecret);

  const load = useCallback(async () => {
    if (!backend.isAvailable) {
      setError('Connect backend in Settings → Backend Server (http://localhost:3000)');
      setLoading(false);
      return;
    }
    try {
      setItems(await fetchInbox());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, [backendApiSecret]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = items.filter((i) => i.link_status === 'suggested' && i.link_id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-text-primary flex items-center gap-2">
          <Film className="w-7 h-7" />
          Reel Inbox
        </h2>
        <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">
          Suggested links from saved Reels (caption + on-screen OCR). Confirm before linking to stars.
        </p>
      </div>
      {loading && <p className="animate-pulse">Loading inbox…</p>}
      {error && <p className="text-amber-600 dark:text-amber-400 text-sm">{error}</p>}
      {!loading && pending.length === 0 && !error && (
        <p className="text-gray-500">No pending suggestions. Run sync-insta and watch-reels.</p>
      )}
      <ul className="space-y-4">
        {pending.map((item) => (
          <li
            key={`${item.id}-${item.link_id}`}
            className="rounded-xl border border-gray-200 dark:border-border-dark bg-white dark:bg-surface-dark p-4"
          >
            <p className="text-sm line-clamp-2">{item.caption || '(no caption)'}</p>
            <p className="text-blue-600 dark:text-blue-400 font-medium mt-2">{item.repo_full_name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {item.extraction_source} · confidence{' '}
              {item.confidence != null ? Math.round(item.confidence * 100) : '?'}%
            </p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm"
                onClick={async () => {
                  if (item.link_id) {
                    await confirmLink(item.link_id);
                    load();
                  }
                }}
              >
                <Check className="w-4 h-4" /> Confirm
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm"
                onClick={async () => {
                  if (item.link_id) {
                    await rejectLink(item.link_id);
                    load();
                  }
                }}
              >
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
