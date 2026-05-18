import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchReadmeImages } from '../services/secondBrainApi';
import { backend } from '../services/backendAdapter';

interface Props {
  fullName: string;
}

export const ReadmeCarousel: React.FC<Props> = ({ fullName }) => {
  const [images, setImages] = useState<Array<{ image_url: string }>>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!backend.isAvailable) return;
    fetchReadmeImages(fullName)
      .then(setImages)
      .catch(() => setImages([]));
  }, [fullName]);

  if (images.length === 0) return null;

  const current = images[index];

  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-border-dark">
      <img
        src={current.image_url}
        alt="README"
        className="w-full max-h-48 object-contain bg-gray-50 dark:bg-gray-900"
      />
      {images.length > 1 && (
        <div className="flex items-center justify-between px-2 py-1 bg-gray-100 dark:bg-gray-800 text-sm">
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
            className="p-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            {index + 1} / {images.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % images.length)}
            className="p-1"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
