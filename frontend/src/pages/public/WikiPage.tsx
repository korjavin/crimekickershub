import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getEntities, getEntityTypes } from '@/lib/api';
import type { Entity } from '@/lib/api-types';

export function WikiPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [selectedHero, setSelectedHero] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const [entitiesData, typesData] = await Promise.all([
          getEntities(),
          getEntityTypes(),
        ]);
        setEntities(entitiesData || []);
        setTypes(typesData || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const allEntities = filter === 'all'
    ? entities
    : entities.filter(e => e.type.toLowerCase() === filter.toLowerCase());

  // Generate mock stats for heroes
  const getHeroStats = (_hero: Entity) => ({
    power: Math.floor(Math.random() * 50) + 50,
    speed: Math.floor(Math.random() * 50) + 50,
    intelligence: Math.floor(Math.random() * 50) + 50,
    durability: Math.floor(Math.random() * 50) + 50,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 bg-violet-500/20 text-violet-300 border-violet-500/50">
            Character Database
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Hero Wiki
            </span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Discover the heroes, villains, and locations that make up the Crime Kickers universe.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-violet-600 hover:bg-violet-700' : 'border-slate-600 text-slate-300'}
          >
            All
          </Button>
          {types.map((t) => (
            <Button
              key={t.slug}
              variant={filter === t.slug ? 'default' : 'outline'}
              onClick={() => setFilter(t.slug)}
              className={filter === t.slug ? 'bg-violet-600 hover:bg-violet-700' : 'border-slate-600 text-slate-300'}
            >
              {t.name}
            </Button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Cards Grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allEntities.map((entity) => (
              <Card
                key={entity.id}
                className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-violet-500/50 transition-all duration-300 group cursor-pointer transform hover:-translate-y-1"
                onClick={() => setSelectedHero(entity)}
              >
                <div className="aspect-square relative overflow-hidden">
                  {entity.avatar_url ? (
                    <img
                      src={entity.avatar_url}
                      alt={entity.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white/50">{entity.name[0]}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                  <Badge
                    className="absolute top-3 right-3 bg-slate-900/80 text-slate-300"
                  >
                    {types.find(t => t.slug === entity.type)?.name || entity.type}
                  </Badge>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-white group-hover:text-violet-400 transition-colors">
                    {entity.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {entity.description || 'No description available.'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && allEntities.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No entities found in this category.</p>
          </div>
        )}

        {/* Hero Detail Dialog */}
        <Dialog open={!!selectedHero} onOpenChange={() => setSelectedHero(null)}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white">{selectedHero?.name}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Character Profile
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 p-1">
                {/* Avatar */}
                <div className="aspect-video relative rounded-lg overflow-hidden">
                  {selectedHero?.avatar_url ? (
                    <img
                      src={selectedHero.avatar_url}
                      alt={selectedHero.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center rounded-lg">
                      <span className="text-6xl font-bold text-white/50">{selectedHero?.name[0]}</span>
                    </div>
                  )}
                </div>

                {/* Type Badge */}
                <div className="flex items-center gap-2">
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/50">
                    {types.find(t => t.slug === selectedHero?.type)?.name || selectedHero?.type}
                  </Badge>
                  {selectedHero?.slug && (
                    <span className="text-sm text-slate-500">#{selectedHero.slug}</span>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Bio</h3>
                  <p className="text-slate-300">
                    {selectedHero?.description || 'No description available for this character.'}
                  </p>
                </div>

                {/* Stats (for heroes) */}
                {selectedHero?.type === 'hero' && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Stats</h3>
                    <div className="space-y-3">
                      {Object.entries(getHeroStats(selectedHero)).map(([stat, value]) => (
                        <div key={stat} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400 capitalize">{stat}</span>
                            <span className="text-white">{value}%</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Origin */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Origin</h3>
                  <p className="text-slate-300">
                    Born in the hidden city of {selectedHero?.name || 'Unknown'},
                    this {types.find(t => t.slug === selectedHero?.type)?.name || selectedHero?.type} has dedicated their life to protecting
                    the innocent and fighting against the forces of darkness.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
