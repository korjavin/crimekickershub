import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createEntity, updateEntity, deleteEntity, uploadMedia } from '@/lib/api';
import type { Entity } from '@/lib/api-types';
import { Plus, Search, Edit2, Trash2, Loader2, Upload, Image as ImageIcon } from 'lucide-react';

const ENTITY_TYPES = ['Hero', 'Villain', 'Location', 'Artifact'] as const;

interface EntityFormData {
  name: string;
  slug: string;
  type: string;
  description: string;
  avatar_url: string | null;
}

const initialFormData: EntityFormData = {
  name: '',
  slug: '',
  type: 'Hero',
  description: '',
  avatar_url: null,
};

export function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [formData, setFormData] = useState<EntityFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [, setAvatarFile] = useState<File | null>(null);

  // Load entities on mount
  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/entities');
      if (response.ok) {
        const data = await response.json();
        setEntities(data);
      }
    } catch (error) {
      console.error('Failed to load entities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    setUploadingAvatar(true);

    try {
      const result = await uploadMedia(file);
      setFormData(prev => ({
        ...prev,
        avatar_url: result.url,
      }));
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const openCreateSheet = () => {
    setEditingEntity(null);
    setFormData(initialFormData);
    setAvatarFile(null);
    setSheetOpen(true);
  };

  const openEditSheet = (entity: Entity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      slug: entity.slug,
      type: entity.type,
      description: entity.description || '',
      avatar_url: entity.avatar_url,
    });
    setAvatarFile(null);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    try {
      // Convert null avatar_url to undefined for API compatibility
      const apiData = {
        name: formData.name,
        slug: formData.slug,
        type: formData.type,
        description: formData.description || undefined,
        avatar_url: formData.avatar_url || undefined,
      };

      if (editingEntity) {
        await updateEntity(editingEntity.id.toString(), apiData);
      } else {
        await createEntity(apiData);
      }
      setSheetOpen(false);
      await loadEntities();
    } catch (error) {
      console.error('Failed to save entity:', error);
      alert('Failed to save entity');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entity: Entity) => {
    if (!confirm(`Are you sure you want to delete "${entity.name}"?`)) {
      return;
    }

    try {
      await deleteEntity(entity.id.toString());
      await loadEntities();
    } catch (error) {
      console.error('Failed to delete entity:', error);
      alert('Failed to delete entity');
    }
  };

  // Filter entities
  const filteredEntities = entities.filter(entity => {
    const matchesSearch = 
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || entity.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Get type badge color
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'Hero': return 'default';
      case 'Villain': return 'destructive';
      case 'Location': return 'secondary';
      case 'Artifact': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Entities</h1>
        <p className="text-muted-foreground">
          Manage characters, locations, and artifacts for your comic universe
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ENTITY_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreateSheet}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Entity
        </Button>
      </div>

      {/* DataTable */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Avatar</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No entities found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntities.map(entity => (
                  <TableRow key={entity.id}>
                    <TableCell>
                      {entity.avatar_url ? (
                        <img
                          src={entity.avatar_url}
                          alt={entity.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{entity.name}</p>
                        <p className="text-sm text-muted-foreground">{entity.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(entity.type) as any}>
                        {entity.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entity.created_at
                        ? new Date(entity.created_at).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditSheet(entity)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entity)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Entity Editor Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle>
              {editingEntity ? 'Edit Entity' : 'Create New Entity'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Avatar Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Avatar</label>
              <div className="flex items-center gap-4">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="avatar-upload"
                    onChange={handleAvatarChange}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                placeholder="e.g., Windman"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input
                placeholder="e.g., windman"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type *</label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Wiki bio (not for generative prompts)"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
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
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
