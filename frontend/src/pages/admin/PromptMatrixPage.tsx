import { PromptMatrix } from '@/components/prompts/PromptMatrix';

export function PromptMatrixPage() {
  const handleMixSelected = (entityIds: number[], typeId: number) => {
    // Navigate to Prompt Studio with pre-selected entities and type
    const params = new URLSearchParams({
      entities: entityIds.join(','),
      type_id: typeId.toString(),
    });
    window.location.href = `/admin/prompt-studio?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Prompt Matrix</h1>
        <p className="text-muted-foreground">
          The "God View" for your prompt engineering. Manage prompts across all entities and types.
        </p>
      </div>

      <PromptMatrix onMixSelected={handleMixSelected} />
    </div>
  );
}
