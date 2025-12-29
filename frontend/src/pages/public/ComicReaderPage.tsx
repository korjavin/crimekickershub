import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getStoryBySlug, getYouTubeEmbedUrl, isYouTubeUrl } from '@/lib/api';
import type { Story, StoryItem, MediaAsset } from '@/lib/api-types';

export function ComicReaderPage() {
  const { slug } = useParams<{ slug: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [items, setItems] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    async function fetchStory() {
      if (!slug) {
        setError('No story specified');
        setLoading(false);
        return;
      }

      try {
        const storyData = await getStoryBySlug(slug);
        setStory(storyData);
        // Note: In a real implementation, we'd fetch story items separately
        // For now, we'll create mock items based on available data
        setItems([
          { id: 1, story_id: storyData.id, media_asset_id: 1, sort_order: 0 },
          { id: 2, story_id: storyData.id, media_asset_id: 2, sort_order: 1 },
          { id: 3, story_id: storyData.id, media_asset_id: 3, sort_order: 2 },
        ]);
      } catch (err) {
        setError('Failed to load story');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStory();
  }, [slug]);

  const nextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, items.length - 1));
  };

  const prevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  };

  // Mock media assets for demo
  const mockImages = [
    'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&q=80',
    'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=800&q=80',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80',
  ];

  const mockVideoId = 'dQw4w9WgXcQ';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Story Not Found</h2>
          <p className="text-slate-400 mb-4">{error || 'The story you are looking for does not exist.'}</p>
          <Link to="/comics">
            <Button className="bg-violet-600 hover:bg-violet-700">Browse Stories</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation Bar */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/comics">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Comics
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-white">{story.title}</h1>
            <p className="text-sm text-slate-400">
              Page {currentPage + 1} of {items.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 0}
              className="border-slate-600 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={currentPage >= items.length - 1}
              className="border-slate-600 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Comic Content - Webtoon Style */}
      <div className="max-w-2xl mx-auto px-0 md:px-4 py-8">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`${index === currentPage ? 'block' : 'hidden'}`}
          >
            {/* Check if this item should be a video (for demo, last item is video) */}
            {index === items.length - 1 ? (
              // YouTube Video
              <div className="relative aspect-video bg-slate-900">
                <iframe
                  src={getYouTubeEmbedUrl(mockVideoId)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              // Comic Panel/Image
              <div className="relative w-full">
                <img
                  src={mockImages[index % mockImages.length]}
                  alt={`${story.title} - Page ${index + 1}`}
                  className="w-full h-auto"
                />
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-slate-900/80 text-white">
                    Page {index + 1}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile Navigation (Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            onClick={prevPage}
            disabled={currentPage === 0}
            className="text-slate-300"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Prev
          </Button>
          <span className="text-sm text-slate-400">
            {currentPage + 1} / {items.length}
          </span>
          <Button
            variant="ghost"
            onClick={nextPage}
            disabled={currentPage >= items.length - 1}
            className="text-slate-300"
          >
            Next
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Spacer for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
}

// Story list page component (for /comics route)
export function ComicListPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStories() {
      try {
        // This would normally come from an API
        setStories([
          { id: 1, title: 'The Beginning', slug: 'the-beginning', cover_image_url: mockImages[0], published: true, created_at: null },
          { id: 2, title: 'City of Shadows', slug: 'city-of-shadows', cover_image_url: mockImages[1], published: true, created_at: null },
          { id: 3, title: 'Rise of the villains', slug: 'rise-of-villains', cover_image_url: mockImages[2], published: true, created_at: null },
        ]);
      } catch (err) {
        console.error('Failed to fetch stories:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, []);

  const mockImages = [
    'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&q=80',
    'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=400&q=80',
    'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&q=80',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 bg-violet-500/20 text-violet-300 border-violet-500/50">
            Comic Series
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Read Comics
            </span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Immerse yourself in the Crime Kickers universe with our webtoon-style comic reader.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <Link key={story.id} to={`/comics/${story.slug}`}>
                <div className="group cursor-pointer">
                  <div className="aspect-[3/4] relative overflow-hidden rounded-lg mb-3">
                    {story.cover_image_url ? (
                      <img
                        src={story.cover_image_url}
                        alt={story.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white/50">{story.title[0]}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <Badge className="bg-violet-600 text-white">
                        Read Now
                      </Badge>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white group-hover:text-violet-400 transition-colors">
                    {story.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
