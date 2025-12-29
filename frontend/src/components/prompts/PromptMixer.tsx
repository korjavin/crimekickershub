import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Entity, PromptType } from '@/lib/api-types';
import { getEntities, getPromptTypes, composePrompt } from '@/lib/api';

interface PromptMixerProps {
  onPromptGenerated: (prompt: string) => void;
  isLoading: boolean;
}

export function PromptMixer({ onPromptGenerated, isLoading }: PromptMixerProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [promptTypes, setPromptTypes] = useState<PromptType[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<number[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        const [entitiesData, typesData] = await Promise.all([
          getEntities(),
          getPromptTypes(),
        ]);
        setEntities(entitiesData || []);
        setPromptTypes(typesData || []);
      } catch (err) {
        console.error('Failed to load data:', err);
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

    try {
      const result = await composePrompt({
        entity_ids: selectedEntities,
        type_slug: selectedType,
      });
      onPromptGenerated(result.prompt);
    } catch (err) {
      console.error('Failed to compose prompt:', err);
    }
  };

  const locations = entities.filter((e) => e.type.toLowerCase() === 'location');
  const heroes = entities.filter((e) => e.type.toLowerCase() === 'hero');

  return (
    <div className="space-y-6">
      {/* Hero Selection */}
      <div>
        <h3 className="font-semibold mb-3">Heroes</h3>
        <div className="grid grid-cols-2 gap-2">
          {heroes.map((entity) => (
            <label
              key={entity.id}
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedEntities.includes(entity.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-muted hover:border-muted-foreground/50'
              }`}
            >
              <Checkbox
                checked={selectedEntities.includes(entity.id)}
                onChange={() => handleEntityToggle(entity.id)}
              />
              <span className="text-sm">{entity.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Location Selection */}
      <div>
        <h3 className="font-semibold mb-3">Location</h3>
        <div className="grid grid-cols-2 gap-2">
          {locations.map((entity) => (
            <label
              key={entity.id}
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedEntities.includes(entity.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-muted hover:border-muted-foreground/50'
              }`}
            >
              <Checkbox
                checked={selectedEntities.includes(entity.id)}
                onChange={() => handleEntityToggle(entity.id)}
              />
              <span className="text-sm">{entity.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Prompt Type Selection */}
      <div>
        <h3 className="font-semibold mb-3">Prompt Type</h3>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger>
            <SelectValue placeholder="Select prompt type" />
          </SelectTrigger>
          <SelectContent>
            {promptTypes.map((type) => (
              <SelectItem key={type.id} value={type.slug}>
                {type.slug}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={selectedEntities.length === 0 || !selectedType || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? 'Generating...' : '✨ Generate Prompt'}
      </Button>
    </div>
  );
}
