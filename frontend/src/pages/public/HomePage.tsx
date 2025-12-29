import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStories, getHeroes } from '@/lib/api';
import type { Story, Entity } from '@/lib/api-types';

export function HomePage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [heroes, setHeroes] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [storiesData, heroesData] = await Promise.all([
          getStories(),
          getHeroes(),
        ]);
        setStories(storiesData);
        setHeroes(heroesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const featuredStory = stories[0];
  const recentStories = stories.slice(1, 7);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/40 via-slate-900/80 to-indigo-900/40" />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4 bg-violet-500/20 text-violet-300 border-violet-500/50">
            Welcome to the Universe
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Heroes Unite
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Dive into the epic Crime Kickers universe. Follow the adventures of Windman, Pho-boman, and more heroes in their fight against evil.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/comics">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white">
                Start Reading
              </Button>
            </Link>
            <Link to="/wiki">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                Meet the Heroes
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-slate-500 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-slate-400 rounded-full" />
          </div>
        </div>
      </section>

      {/* Featured Story */}
      {featuredStory && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
              <span className="w-2 h-8 bg-violet-500 rounded-full" />
              Featured Story
            </h2>
            <Link to={`/comics/${featuredStory.slug}`}>
              <Card className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-violet-500/50 transition-all duration-300 group">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="aspect-[4/3] md:aspect-auto relative overflow-hidden">
                    {featuredStory.cover_image_url ? (
                      <img
                        src={featuredStory.cover_image_url}
                        alt={featuredStory.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                        <span className="text-6xl font-bold text-white/20">?</span>
                      </div>
                    )}
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <Badge className="w-fit mb-4 bg-violet-500/20 text-violet-300 border-violet-500/50">
                      Latest Issue
                    </Badge>
                    <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-violet-400 transition-colors">
                      {featuredStory.title}
                    </h3>
                    <p className="text-slate-400 mb-6">
                      Join our heroes in their latest adventure. An epic tale of courage, friendship, and the power of justice.
                    </p>
                    <Button className="w-fit bg-violet-600 hover:bg-violet-700">
                      Read Now
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </section>
      )}

      {/* Latest Updates Grid */}
      {recentStories.length > 0 && (
        <section className="py-16 px-4 bg-slate-900/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
              <span className="w-2 h-8 bg-indigo-500 rounded-full" />
              Latest Updates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentStories.map((story) => (
                <Link key={story.id} to={`/comics/${story.slug}`}>
                  <Card className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-indigo-500/50 transition-all duration-300 group h-full">
                    <div className="aspect-[16/9] relative overflow-hidden">
                      {story.cover_image_url ? (
                        <img
                          src={story.cover_image_url}
                          alt={story.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <span className="text-4xl font-bold text-white/20">{story.title[0]}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {story.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-slate-400">
                        {story.published ? 'Published' : 'Coming Soon'}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            {stories.length > 7 && (
              <div className="text-center mt-8">
                <Link to="/comics">
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                    View All Stories
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Heroes Preview */}
      {heroes.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
              <span className="w-2 h-8 bg-purple-500 rounded-full" />
              Meet the Heroes
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {heroes.slice(0, 8).map((hero) => (
                <Link key={hero.id} to="/wiki">
                  <Card className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all duration-300 group">
                    <div className="aspect-square relative overflow-hidden">
                      {hero.avatar_url ? (
                        <img
                          src={hero.avatar_url}
                          alt={hero.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white/50">{hero.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <CardFooter className="justify-center py-3">
                      <span className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">
                        {hero.name}
                      </span>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link to="/wiki">
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                  View All Heroes
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Loading State */}
      {loading && (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && stories.length === 0 && (
        <div className="min-h-[50vh] flex items-center justify-center">
          <Card className="bg-slate-800/50 border-slate-700 max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-white text-center">No Stories Yet</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-400 mb-4">
                Check back soon for new adventures in the Crime Kickers universe!
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
