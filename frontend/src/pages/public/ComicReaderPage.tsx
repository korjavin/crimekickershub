import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStoryBySlug } from '../../lib/api';
import { ComicReader } from '../../components/ComicReader';
import { ChevronLeft } from 'lucide-react';

interface Story {
  title: string;
  items: Array<{
    type: 'image' | 'video';
    url?: string;
    youtube_id?: string;
    aspect_ratio?: string;
  }>;
}

export const ComicReaderPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      setLoading(true);
      getStoryBySlug(slug)
        .then((data) => {
          setStory(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to load story');
          setLoading(false);
        });
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-black text-white">
        <div className="text-red-500 mb-4">{error || 'Story not found'}</div>
        <Link to="/comics" className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200">
          Back to Comics
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md text-white px-4 py-3 flex items-center border-b border-gray-800">
        <Link to="/comics" className="mr-4 p-1 hover:bg-gray-800 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-bold truncate flex-1">{story.title}</h1>
      </div>

      {/* Comic Reader */}
      <ComicReader items={story.items} />

      {/* Footer / Navigation */}
      <div className="max-w-[600px] mx-auto p-8 flex justify-center bg-black">
        <button className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors w-full max-w-xs">
          Next Episode
        </button>
      </div>
    </div>
  );
};
