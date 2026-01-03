import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import type { Entity, PromptType, EntityType } from '@/lib/api-types';
import { getEntities, getPromptTypes, getEntityTypes, composePrompt } from '@/lib/api';

interface PromptMixerProps {
  onPromptGenerated: (prompt: string, entityIds: number[], typeSlug: string) => void;
  isLoading: boolean;
}

export function PromptMixer({ onPromptGenerated, isLoading: externalLoading }: PromptMixerProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [promptTypes, setPromptTypes] = useState<PromptType[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<number[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedEntityTypeFilter, setSelectedEntityTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      setError(null);

      try {
        const [entitiesData, typesData, entityTypesData] = await Promise.all([
          getEntities(),
          getPromptTypes(),
          getEntityTypes(),
        ]);
        setEntities(entitiesData || []);
        setPromptTypes(typesData || []);
        setEntityTypes(entityTypesData || []);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load entities and templates. Please ensure you are logged in.');
      } finally {
        setIsLoadingData(false);
      }
    }
    loadData();
  }, []);

  const handleEntityToggle = (entityId: number) => {
    setSelectedEntities((prev) =>
      prev.includes(entityId)
        ? prev.filter((id) => id !== entityId)
        : [...prev, entityId]
    );
  };

  const handleGenerate = async () => {
    if (selectedEntities.length === 0 || !selectedType) {
      return;
    }

    setIsGenerating(true);
    try {
      const result = await composePrompt({
        entity_ids: selectedEntities,
        type_slug: selectedType,
      });
      onPromptGenerated(result.prompt, selectedEntities, selectedType);
    } catch (err) {
      console.error('Failed to compose prompt:', err);
      setError('Failed to generate prompt. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredEntities = useMemo(() => {
    return entities.filter(entity => {
      // Filter by type
      if (selectedEntityTypeFilter !== 'all') {
        const typeMatch = entity.type.toLowerCase() === selectedEntityTypeFilter.toLowerCase();

        if (!typeMatch) return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          entity.name.toLowerCase().includes(query) ||
          (entity.description && entity.description.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [entities, selectedEntityTypeFilter, searchQuery]);

  // Group entities by type for display if "all" is selected, otherwise just show list
  const groupedEntities = useMemo(() => {
    if (selectedEntityTypeFilter !== 'all') {
      return { [selectedEntityTypeFilter]: filteredEntities };
    }

    // Group by entity type
    const groups: Record<string, Entity[]> = {};
    filteredEntities.forEach(entity => {
      const type = entity.type || 'Other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(entity);
    });
    return groups;
  }, [filteredEntities, selectedEntityTypeFilter]);

  const hasSelections = selectedEntities.length > 0 && selectedType;
  const isLoading = isLoadingData || externalLoading;

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 rounded-lg p-3">
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-3"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Subject(s) & Location Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Subject(s) & Location</h3>
              <Badge variant="secondary" className="ml-2">
                {selectedEntities.length} selected
              </Badge>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select
                value={selectedEntityTypeFilter}
                onValueChange={setSelectedEntityTypeFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {entityTypes.map(type => (
                    <SelectItem key={type.id} value={type.slug}>
                      {type.name}
                    </SelectItem>
                  ))}
                  {/* Fallback for hardcoded types if not in DB yet */}
                  {!entityTypes.find(t => t.slug === 'hero') && <SelectItem value="hero">Heroes</SelectItem>}
                  {!entityTypes.find(t => t.slug === 'villain') && <SelectItem value="villain">Villains</SelectItem>}
                  {!entityTypes.find(t => t.slug === 'location') && <SelectItem value="location">Locations</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Entity List */}
            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 border rounded-md p-2 bg-slate-50/50">
              {Object.keys(groupedEntities).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No entities found matching your filters.
                </div>
              ) : (
                Object.entries(groupedEntities).map(([type, typeEntities]) => (
                  <div key={type} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider sticky top-0 bg-slate-50/95 py-1 z-10 backdrop-blur">
                      {type} ({typeEntities.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {typeEntities.map((entity) => (
                        <label
                          key={entity.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${selectedEntities.includes(entity.id)
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-muted bg-white hover:border-primary/50'
                            }`}
                        >
                          <Checkbox
                            checked={selectedEntities.includes(entity.id)}
                            onChange={() => handleEntityToggle(entity.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate" title={entity.name}>
                              {entity.name}
                            </div>
                            {entity.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {entity.description}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Generator Template Selection */}
          <div className="space-y-3">
            <h3 className="font-semibold">Generator Template</h3>
            {promptTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No templates available. Create prompt types in the Prompt Types page first.
              </p>
            ) : (
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {promptTypes.map((type) => (
                    <SelectItem key={type.id} value={type.slug}>
                      {type.description || type.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Generate / Mix Button */}
          <Button
            onClick={handleGenerate}
            disabled={!hasSelections || isGenerating}
            className="w-full h-12 text-lg shadow-sm"
          >
            {isGenerating ? 'Mixing...' : '✨ Mix Prompt'}
          </Button>
        </>
      )}
    </div>
  );
}
