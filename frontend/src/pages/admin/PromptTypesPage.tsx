import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { createPromptType, updatePromptType, deletePromptType } from '@/lib/api';
import type { PromptType } from '@/lib/api-types';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';

interface PromptTypeFormData {
  slug: string;
  description: string;
  template_text: string;
}

const initialFormData: PromptTypeFormData = {
  slug: '',
  description: '',
  template_text: '',
};

export function PromptTypesPage() {
  const [promptTypes, setPromptTypes] = useState<PromptType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PromptType | null>(null);
  const [formData, setFormData] = useState<PromptTypeFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  // Load prompt types on mount
  useEffect(() => {
    loadPromptTypes();
  }, []);

  const loadPromptTypes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/prompts/types');
      if (response.ok) {
        const data = await response.json();
        setPromptTypes(data);
      }
    } catch (error) {
      console.error('Failed to load prompt types:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate slug from description (label)
  const generateSlug = (description: string) => {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');
  };

  const handleDescriptionChange = (description: string) => {
    setFormData(prev => ({
      ...prev,
      description,
      slug: generateSlug(description), // Always auto-gen
    }));
  };

  const handleTemplateChange = (template_text: string) => {
    setFormData(prev => ({ ...prev, template_text }));
  };

  const openCreateDialog = () => {
    setEditingType(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (type: PromptType) => {
    setEditingType(type);
    setFormData({
      slug: type.slug,
      description: type.description || '',
      template_text: type.template_text,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.description.trim()) {
      alert('Label is required');
      return;
    }
    if (!formData.template_text.trim()) {
      alert('Template is required');
      return;
    }

    setSaving(true);
    try {
      const apiData = {
        slug: formData.slug,
        description: formData.description,
        template_text: formData.template_text,
      };

      if (editingType) {
        await updatePromptType(editingType.id.toString(), apiData);
      } else {
        await createPromptType(apiData);
      }
      setDialogOpen(false);
      await loadPromptTypes();
    } catch (error) {
      console.error('Failed to save prompt type:', error);
      alert('Failed to save prompt type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: PromptType) => {
    if (!confirm(`Are you sure you want to delete "${type.description || type.slug}"?`)) {
      return;
    }

    try {
      await deletePromptType(type.id.toString());
      await loadPromptTypes();
    } catch (error) {
      console.error('Failed to delete prompt type:', error);
      alert('Failed to delete prompt type');
    }
  };

  // Truncate template for preview
  const truncateTemplate = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Prompt Types</h1>
        <p className="text-muted-foreground">
          Manage prompt type templates for the Prompt Studio
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Type
        </Button>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : promptTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No prompt types found</p>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Prompt Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promptTypes.map(type => (
            <Card key={type.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {type.description || '(No label)'}
                    </CardTitle>
                    <Badge variant="secondary">{type.slug}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(type)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(type)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Template:</p>
                  <div className="p-3 bg-muted rounded text-sm font-mono whitespace-pre-wrap">
                    {truncateTemplate(type.template_text)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Prompt Type' : 'Create New Prompt Type'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Label / Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Label *</label>
              <Input
                placeholder="e.g., Sora Video (Cinematic)"
                value={formData.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Display name for this prompt type
              </p>
            </div>



            {/* Template */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Template *</label>
              <Textarea
                placeholder="e.g., Cinematic shot of {{ENTITY}}, 8k resolution, unreal engine 5 render, --ar 16:9"
                value={formData.template_text}
                onChange={(e) => handleTemplateChange(e.target.value)}
                rows={5}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="px-1 bg-muted rounded">{'{'}ENTITY{'}'}</code> for character description and <code className="px-1 bg-muted rounded">{'{'}LOCATION{'}'}</code> for location description
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>

              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
