import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptMixer } from '@/components/prompts/PromptMixer';
import { PromptResult } from '@/components/prompts/PromptResult';
import { PromptHistory } from '@/components/prompts/PromptHistory';
import { getEntities, getPromptTypes } from '@/lib/api';
import type { Entity, PromptType } from '@/lib/api-types';

export function PromptStudioPage() {
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [promptTypes, setPromptTypes] = useState<PromptType[]>([]);
  const [selectedEntityIds, setSelectedEntityIds] = useState<number[]>([]);
  const [selectedTypeSlug, setSelectedTypeSlug] = useState<string>('');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entitiesData, typesData] = await Promise.all([
        getEntities(),
        getPromptTypes(),
      ]);
      setEntities(entitiesData || []);
      setPromptTypes(typesData || []);
    } catch (error) {
      console.error('Failed to load prompt studio data:', error);
    }
  };

  const handlePromptGenerated = (prompt: string, ids: number[], typeSlug: string) => {
    setGeneratedPrompt(prompt);
    setSelectedEntityIds(ids);
    setSelectedTypeSlug(typeSlug);
  };

  const handleSaved = () => {
    setGeneratedPrompt('');
    setSelectedEntityIds([]);
    setSelectedTypeSlug('');
    loadData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Prompt Studio</h1>
        <p className="text-muted-foreground">
          Compose and manage AI prompts for your creative workflow
        </p>
      </div>

      <Tabs defaultValue="mixer" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mixer">Prompt Mixer</TabsTrigger>
          <TabsTrigger value="result">Result Editor</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="mixer" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Compose Prompt</h2>
              <PromptMixer
                onPromptGenerated={handlePromptGenerated}
                isLoading={false}
              />
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Generated Prompt</h2>
              {generatedPrompt ? (
                <div className="bg-muted rounded-lg p-4 whitespace-pre-wrap font-mono text-sm">
                  {generatedPrompt}
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  Select subjects and a template, then click Mix.
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="result" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Edit & Save Prompt</h2>
            <PromptResult
              prompt={generatedPrompt}
              promptTypes={promptTypes}
              entities={entities}
              selectedEntityIds={selectedEntityIds}
              selectedTypeSlug={selectedTypeSlug}
              onSaved={handleSaved}
            />
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="p-6">
            <PromptHistory />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
