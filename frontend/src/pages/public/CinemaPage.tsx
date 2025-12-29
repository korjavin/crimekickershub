import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Play, X } from 'lucide-react';
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from '@/lib/api';

interface VideoItem {
  id: number;
  youtube_id: string;
  title: string;
  description: string;
  tags: string[];
}

// Mock video data for demo
const mockVideos: VideoItem[] = [
  {
    id: 1,
    youtube_id: 'dQw4w9WgXcQ',
    title: 'Heroes Unite - Official Trailer',
    description: 'Watch the Crime Kickers team up for their biggest adventure yet!',
    tags: ['trailer', 'action'],
  },
  {
    id: 2,
    youtube_id: '9bZkp7q19f0',
    title: 'Windman Origin Story',
    description: 'Discover how Windman gained his incredible powers.',
    tags: ['origin', 'backstory'],
  },
  {
    id: 3,
    youtube_id: 'JGwWNGJdvx8',
    title: 'Pho-boman: Behind the Scenes',
    description: 'Exclusive behind-the-scenes footage from the latest issue.',
    tags: ['behind-the-scenes', 'featurette'],
  },
  {
    id: 4,
    youtube_id: 'kJQP7kiw5Fk',
    title: 'Villain Spotlight: Shadow Lord',
    description: 'An in-depth look at the Crim Crime Kickers universe.',
    tags: ['villain', 'documentary'],
  },
  {
    id: 5,
    youtube_id: '9bZkp7q19f0',
    title: 'City of Shadows - Episode 1',
    description: 'The first episode of our animated series.',
    tags: ['animated', 'series'],
  },
  {
    id: 6,
    youtube_id: 'JGwWNGJdvx8',
    title: 'Making of Crime Kickers',
    description: 'The creative process behind the comic.',
    tags: ['documentary', 'making-of'],
  },
];

export function CinemaPage() {
  const [videos] = useState<VideoItem[]>(mockVideos);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Get all unique tags
  const allTags = Array.from(new Set(videos.flatMap(v => v.tags)));

  // Filter videos
  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          video.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !activeTag || video.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 bg-violet-500/20 text-violet-300 border-violet-500/50">
            Video Gallery
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Cinema
            </span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Watch trailers, behind-the-scenes content, and exclusive videos from the Crime Kickers universe.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="search"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant={activeTag === null ? 'default' : 'outline'}
              onClick={() => setActiveTag(null)}
              className={activeTag === null ? 'bg-violet-600 hover:bg-violet-700' : 'border-slate-600 text-slate-300'}
              size="sm"
            >
              All
            </Button>
            {allTags.map(tag => (
              <Button
                key={tag}
                variant={activeTag === tag ? 'default' : 'outline'}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={activeTag === tag ? 'bg-violet-600 hover:bg-violet-700' : 'border-slate-600 text-slate-300'}
                size="sm"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <Card
              key={video.id}
              className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-violet-500/50 transition-all duration-300 group cursor-pointer transform hover:-translate-y-1"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={getYouTubeThumbnail(video.youtube_id)}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-slate-900/60 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-violet-600/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>
                <div className="absolute bottom-3 right-3">
                  <Badge className="bg-slate-900/80 text-white">
                    {video.tags[0]}
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-4">
                <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors line-clamp-1">
                  {video.title}
                </h3>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                  {video.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {video.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs border-slate-600 text-slate-400">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredVideos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No videos found matching your criteria.</p>
            <Button
              variant="outline"
              onClick={() => { setSearchQuery(''); setActiveTag(null); }}
              className="mt-4 border-slate-600 text-slate-300"
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Video Player Dialog */}
        <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
          <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-white pr-8">{selectedVideo?.title}</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden">
                {selectedVideo && (
                  <iframe
                    src={getYouTubeEmbedUrl(selectedVideo.youtube_id)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
              <div>
                <p className="text-slate-300">{selectedVideo?.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedVideo?.tags.map(tag => (
                    <Badge key={tag} className="bg-violet-500/20 text-violet-300 border-violet-500/50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
