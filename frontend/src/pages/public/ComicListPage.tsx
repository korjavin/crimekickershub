import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStories } from '../../lib/api';

interface Story {
  id: number;
  title: string;
  slug: string;
  cover_image_url?: string;
}

export const ComicListPage: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStories()
      .then((data) => {
        setStories(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-white">Loading comics...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-white">Comics</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {stories.map((story) => (
          <Link
            key={story.id}
            to={`/comics/${story.slug}`}
            className="block group bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors"
          >
            <div className="aspect-[2/3] bg-gray-800 relative">
              {story.cover_image_url ? (
                <img
                  src={story.cover_image_url}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-gray-600">
                  No Cover
                </div>
              )}
            </div>
            <div className="p-4">
              <h2 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                {story.title}
              </h2>
            </div>
          </Link>
        ))}
      </div>
      {stories.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          No comics available yet.
        </div>
      )}
    </div>
  );
};
