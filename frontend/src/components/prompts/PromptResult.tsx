import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { savePrompt } from '@/lib/api';
import type { PromptType, Entity } from '@/lib/api-types';

interface PromptResultProps {
  prompt: string;
  promptTypes: PromptType[];
  entities: Entity[];
  selectedEntityIds: number[];
  selectedTypeSlug: string;
  onSaved: () => void;
}

export function PromptResult({ 
  prompt, 
  promptTypes, 
  entities, 
  selectedEntityIds, 
  selectedTypeSlug,
  onSaved 
}: PromptResultProps) {
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with props from PromptMixer
  useEffect(() => {
    if (selectedTypeSlug) {
      setSelectedType(selectedTypeSlug);
    }
    if (selectedEntityIds.length > 0) {
      setSelectedEntity(selectedEntityIds[0]);
    }
  }, [selectedTypeSlug, selectedEntityIds]);

  // Update editedPrompt when prompt prop changes
  useEffect(() => {
    setEditedPrompt(prompt);
  }, [prompt]);

  const handleSave = async () => {
    const type = promptTypes.find((t) => t.slug === selectedType);
    if (!type || !selectedEntity) {
      return;
    }

    setIsSaving(true);
    try {
      await savePrompt({
        entity_id: selectedEntity,
        type_id: type.id,
        prompt_text: editedPrompt,
      });
      onSaved();
    } catch (err) {
      console.error('Failed to save prompt:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Get selected entity names for display
  const selectedEntityNames = entities
    .filter((e) => selectedEntityIds.includes(e.id))
    .map((e) => e.name)
    .join(', ');

  return (
    <div className="space-y-4">
      {/* Selected Subjects Display */}
      {selectedEntityNames && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <span className="font-medium">Subject(s): </span>
          {selectedEntityNames}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Generator Template</label>
          <select
            className="w-full p-2 rounded border bg-background"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">Select template</option>
            {promptTypes.map((type) => (
              <option key={type.id} value={type.slug}>
                {type.description || type.slug}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Primary Subject</label>
          <select
            className="w-full p-2 rounded border bg-background"
            value={selectedEntity || ''}
            onChange={(e) => setSelectedEntity(Number(e.target.value))}
          >
            <option value="">Select subject</option>
            {entities.filter((e) => selectedEntityIds.includes(e.id)).map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Prompt</label>
        <Textarea
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          rows={8}
          className="font-mono text-sm"
          placeholder="Select subjects and a template, then click Mix."
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={!selectedType || !selectedEntity || isSaving}
        className="w-full"
      >
        {isSaving ? 'Saving...' : '💾 Save as New Version'}
      </Button>
    </div>
  );
}
