import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getMatrixData, savePrompt, listPromptVersions } from '@/lib/api';
import type { Entity, PromptType } from '@/lib/api-types';
import { Loader2, Plus, Layers, Image as ImageIcon } from 'lucide-react';

interface MatrixVersion {
  id: number;
  entity_id: number;
  type_id: number;
  version_number: number;
  prompt_text: string;
  created_at: string;
}

interface MatrixData {
  entities: Entity[];
  types: PromptType[];
  versions: Record<string, MatrixVersion>;
}

interface PromptMatrixProps {
  onMixSelected?: (entityIds: number[], typeId: number) => void;
}

export function PromptMatrix({ onMixSelected }: PromptMatrixProps) {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntities, setSelectedEntities] = useState<Set<number>>(new Set());
  const [selectedType, setSelectedType] = useState<string>('');

  // Editor dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ entity: Entity; type: PromptType } | null>(null);
  const [editorText, setEditorText] = useState('');
  const [versionHistory, setVersionHistory] = useState<MatrixVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const matrixData = await getMatrixData();
      setData(matrixData);
    } catch (error) {
      console.error('Failed to load matrix:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersionHistory = async (entityId: number, typeId: number) => {
    try {
      const versions = await listPromptVersions();
      const filtered = versions.filter(
        (v: any) => v.entity_id === entityId && v.type_id === typeId
      );
      setVersionHistory(filtered);
    } catch (error) {
      console.error('Failed to load version history:', error);
    }
  };

  const handleCellClick = async (entity: Entity, type: PromptType) => {
    setEditingCell({ entity, type });

    // Load existing prompt text if version exists
    const key = `${entity.id}_${type.id}`;
    const existingVersion = data?.versions[key];

    if (existingVersion) {
      setEditorText(existingVersion.prompt_text);
      setSelectedVersion(existingVersion.id);
    } else {
      setEditorText('');
      setSelectedVersion(null);
    }

    await loadVersionHistory(entity.id, type.id);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editingCell || !editorText.trim()) return;

    setSaving(true);
    try {
      await savePrompt({
        entity_id: editingCell.entity.id,
        type_id: editingCell.type.id,
        prompt_text: editorText,
      });
      setEditorOpen(false);
      await loadMatrix();
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleVersionSelect = (versionId: number) => {
    setSelectedVersion(versionId);
    const version = versionHistory.find((v: any) => v.id === versionId);
    if (version) {
      setEditorText(version.prompt_text);
    }
  };

  const toggleEntitySelection = (entityId: number) => {
    const newSelection = new Set(selectedEntities);
    if (newSelection.has(entityId)) {
      newSelection.delete(entityId);
    } else {
      newSelection.add(entityId);
    }
    setSelectedEntities(newSelection);
  };

  const handleMixSelected = () => {
    if (selectedEntities.size === 0 || !selectedType) {
      alert('Please select entities and a prompt type');
      return;
    }
    onMixSelected?.(Array.from(selectedEntities), parseInt(selectedType));
  };

  const getVersionForCell = (entityId: number, typeId: number) => {
    const key = `${entityId}_${typeId}`;
    return data?.versions[key];
  };

  const truncateText = (text: string, maxLength: number = 40) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.entities.length === 0 || data.types.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          No entities or prompt types configured yet.
        </p>
        <p className="text-sm text-muted-foreground">
          Create entities and prompt types first to build your matrix.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedEntities.size > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedEntities.size} entity{selectedEntities.size > 1 ? 'ies' : ''} selected
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground mr-2">Mix as:</span>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select prompt type" />
                </SelectTrigger>
                <SelectContent>
                  {data.types.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.description || type.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleMixSelected}
                disabled={!selectedType}
              >
                <Layers className="w-4 h-4 mr-2" />
                Mix Selected
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedEntities(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Matrix Grid */}
      <Card className="overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-3 text-left w-[40px]">
                <Checkbox
                  checked={selectedEntities.size === data.entities.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEntities(new Set(data.entities.map(entity => entity.id)));
                    } else {
                      setSelectedEntities(new Set());
                    }
                  }}
                />
              </th>
              <th className="p-3 text-left w-[150px]">Entity</th>
              {data.types.map((type) => (
                <th key={type.id} className="p-3 text-center min-w-[120px]">
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="secondary">{type.slug}</Badge>
                    <span className="text-xs text-muted-foreground font-normal">
                      {type.description || ''}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.entities.map((entity) => (
              <tr key={entity.id} className="border-b hover:bg-muted/50">
                <td className="p-3">
                  <Checkbox
                    checked={selectedEntities.has(entity.id)}
                    onChange={() => toggleEntitySelection(entity.id)}
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {entity.avatar_url ? (
                      <img
                        src={entity.avatar_thumbnail_url || entity.avatar_url}
                        alt={entity.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{entity.name}</p>
                      <p className="text-xs text-muted-foreground">{entity.type}</p>
                    </div>
                  </div>
                </td>
                {data.types.map((type) => {
                  const version = getVersionForCell(entity.id, type.id);
                  return (
                    <td key={type.id} className="p-2 text-center">
                      <button
                        onClick={() => handleCellClick(entity, type)}
                        className={`
                          w-full h-16 px-2 py-1 rounded border transition-colors
                          flex flex-col items-center justify-center gap-1
                          ${version
                            ? 'bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer'
                            : 'bg-muted/30 border-dashed hover:bg-muted/50 cursor-pointer border-muted-foreground/25'
                          }
                        `}
                      >
                        {version ? (
                          <>
                            <Badge variant="outline" className="text-xs">
                              v{version.version_number}
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                              {truncateText(version.prompt_text)}
                            </span>
                          </>
                        ) : (
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingCell && `Edit: ${editingCell.entity.name} × ${editingCell.type.description || editingCell.type.slug}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Version History */}
            {versionHistory.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Version History</label>
                <Select
                  value={selectedVersion?.toString() || ''}
                  onValueChange={(v) => handleVersionSelect(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionHistory.map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        v{v.version_number} - {new Date(v.created_at).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt Text</label>
              <Textarea
                placeholder={`Enter prompt for ${editingCell?.type.description || 'this type'}...`}
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                rows={8}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="px-1 bg-muted rounded">{'{'}ENTITY{'}'}</code> placeholder for character description
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditorOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !editorText.trim()}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save New Version'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
