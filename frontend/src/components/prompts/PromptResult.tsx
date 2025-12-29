import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { savePrompt } from '@/lib/api';
import type { PromptType, Entity } from '@/lib/api-types';

interface PromptResultProps {
  prompt: string;
  promptTypes: PromptType[];
  entities: Entity[];
  onSaved: () => void;
}

export function PromptResult({ prompt, promptTypes, entities, onSaved }: PromptResultProps) {
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedType || !selectedEntity) {
      return;
    }

    setIsSaving(true);
    try {
      const type = promptTypes.find((t) => t.slug === selectedType);
      if (!type) return;

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Entity</label>
          <select
            className="w-full p-2 rounded border bg-background"
            value={selectedEntity || ''}
            onChange={(e) => setSelectedEntity(Number(e.target.value))}
          >
            <option value="">Select entity</option>
            {entities.filter((e) => e.type === 'hero').map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Type</label>
          <select
            className="w-full p-2 rounded border bg-background"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">Select type</option>
            {promptTypes.map((type) => (
              <option key={type.id} value={type.slug}>
                {type.slug}
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
