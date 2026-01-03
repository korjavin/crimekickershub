import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { getEntityTypes, createEntityType, updateEntityType, deleteEntityType } from '@/lib/api';
import { Plus, Search, Edit2, Trash2, Loader2, Tags } from 'lucide-react';

interface EntityType {
    id: number;
    slug: string;
    name: string;
    description?: string;
}

interface TypeFormData {
    name: string;
    slug: string;
    description: string;
}

const initialFormData: TypeFormData = {
    name: '',
    slug: '',
    description: '',
};

export function EntityTypesPage() {
    const [types, setTypes] = useState<EntityType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingType, setEditingType] = useState<EntityType | null>(null);
    const [formData, setFormData] = useState<TypeFormData>(initialFormData);
    const [saving, setSaving] = useState(false);

    // Load types on mount
    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        setLoading(true);
        try {
            const data = await getEntityTypes();
            setTypes(data || []);
        } catch (error) {
            console.error('Failed to load entity types:', error);
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
            slug: generateSlug(name), // Always auto-gen
        }));
    };

    const openCreateSheet = () => {
        setEditingType(null);
        setFormData(initialFormData);
        setSheetOpen(true);
    };

    const openEditSheet = (type: EntityType) => {
        setEditingType(type);
        setFormData({
            name: type.name,
            slug: type.slug,
            description: type.description || '',
        });
        setSheetOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert('Name is required');
            return;
        }

        setSaving(true);
        try {
            const apiData = {
                name: formData.name,
                slug: formData.slug,
                description: formData.description || undefined,
            };

            if (editingType) {
                await updateEntityType(editingType.id, apiData);
            } else {
                await createEntityType(apiData);
            }
            setSheetOpen(false);
            await loadTypes();
        } catch (error) {
            console.error('Failed to save entity type:', error);
            alert('Failed to save entity type');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (type: EntityType) => {
        if (!confirm(`Are you sure you want to delete "${type.name}"? This might break entities using this type.`)) {
            return;
        }

        try {
            await deleteEntityType(type.id);
            await loadTypes();
        } catch (error) {
            console.error('Failed to delete entity type:', error);
            alert('Failed to delete entity type');
        }
    };

    // Filter types
    const filteredTypes = types.filter(type =>
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Tags className="w-8 h-8" />
                    Entity Types
                </h1>
                <p className="text-muted-foreground">
                    Define the categories for your entities (e.g., Hero, Villain, Location)
                </p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search types..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button onClick={openCreateSheet}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Type
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
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTypes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No types found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTypes.map(type => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">{type.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{type.slug}</TableCell>
                                        <TableCell className="text-muted-foreground truncate max-w-xs">
                                            {type.description || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditSheet(type)}
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
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Editor Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>
                            {editingType ? 'Edit Entity Type' : 'Create Entity Type'}
                        </SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name *</label>
                            <Input
                                placeholder="e.g., Hero"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                            />
                        </div>



                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                placeholder="Describe this category..."
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
