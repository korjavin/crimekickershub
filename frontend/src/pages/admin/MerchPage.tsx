import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
    getMerchAdmin,
    createMerch,
    updateMerch,
    deleteMerch,
    uploadMedia,
    type Merch,
    type MerchInput,
} from '@/lib/api';
import { Plus, Search, Edit2, Trash2, Loader2, ShoppingBag, EyeOff, Upload, Image as ImageIcon } from 'lucide-react';

const RISO_COLORS = ['pink', 'blue', 'mustard', 'violet', 'teal', 'coral', 'mint'];

interface MerchFormData {
    title: string;
    description: string;
    image_url: string;
    thumbnail_url: string;
    tag: string;
    color: string;
    sort_order: number;
    published: boolean;
}

const initialFormData: MerchFormData = {
    title: '',
    description: '',
    image_url: '',
    thumbnail_url: '',
    tag: '',
    color: 'pink',
    sort_order: 0,
    published: true,
};

export function MerchPage() {
    const [items, setItems] = useState<Merch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Merch | null>(null);
    const [formData, setFormData] = useState<MerchFormData>(initialFormData);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await getMerchAdmin();
            setItems(data || []);
        } catch (error) {
            console.error('Failed to load merch:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateSheet = () => {
        setEditingItem(null);
        const nextOrder = items.reduce((max, m) => Math.max(max, m.sort_order), 0) + 1;
        setFormData({ ...initialFormData, sort_order: nextOrder });
        setSheetOpen(true);
    };

    const openEditSheet = (item: Merch) => {
        setEditingItem(item);
        setFormData({
            title: item.title,
            description: item.description || '',
            image_url: item.image_url || '',
            thumbnail_url: item.thumbnail_url || '',
            tag: item.tag || '',
            color: item.color || 'pink',
            sort_order: item.sort_order,
            published: item.published,
        });
        setSheetOpen(true);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const result = await uploadMedia(file);
            setFormData((prev) => ({
                ...prev,
                image_url: result.url,
                thumbnail_url: result.thumbnail_url || result.url,
            }));
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('Failed to upload image');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            alert('Title is required');
            return;
        }

        setSaving(true);
        try {
            const apiData: MerchInput = {
                title: formData.title.trim(),
                description: formData.description,
                image_url: formData.image_url,
                thumbnail_url: formData.thumbnail_url,
                tag: formData.tag,
                color: formData.color,
                sort_order: Number(formData.sort_order) || 0,
                published: formData.published,
            };

            if (editingItem) {
                await updateMerch(editingItem.id, apiData);
            } else {
                await createMerch(apiData);
            }
            setSheetOpen(false);
            await loadItems();
        } catch (error) {
            console.error('Failed to save merch:', error);
            alert('Failed to save merch item');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: Merch) => {
        if (!confirm(`Delete "${item.title}"? This removes it from the Merch page.`)) {
            return;
        }
        try {
            await deleteMerch(item.id);
            await loadItems();
        } catch (error) {
            console.error('Failed to delete merch:', error);
            alert('Failed to delete merch item');
        }
    };

    const filteredItems = items.filter(
        (m) =>
            m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.tag || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <ShoppingBag className="w-8 h-8" />
                    Merch
                </h1>
                <p className="text-muted-foreground">
                    Manage merch items shown on the public Merch page. Track interest counts to plan production.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search merch..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button onClick={openCreateSheet}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                </Button>
            </div>

            <Card>
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Image</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="w-[90px]">Wants</TableHead>
                                <TableHead className="w-[80px]">Order</TableHead>
                                <TableHead className="w-[100px]">Status</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No merch items yet. Click "Add Item" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {item.thumbnail_url ? (
                                                <img
                                                    src={item.thumbnail_url}
                                                    alt={item.title}
                                                    className="w-[100px] h-[56px] object-cover rounded border"
                                                />
                                            ) : (
                                                <div
                                                    className="w-[100px] h-[56px] flex items-center justify-center rounded border text-xs uppercase font-mono text-muted-foreground"
                                                    style={{ background: 'var(--muted, #f4f4f5)' }}
                                                >
                                                    no img
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{item.title}</TableCell>
                                        <TableCell className="text-xs font-mono uppercase">
                                            {item.tag || '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm font-medium">
                                            {item.want_count}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{item.sort_order}</TableCell>
                                        <TableCell>
                                            {item.published ? (
                                                <span className="text-xs text-green-600 font-medium">Published</span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <EyeOff className="w-3 h-3" /> Hidden
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEditSheet(item)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
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

            <Sheet open={sheetOpen} onOpenChange={(open) => { if (!uploadingImage) setSheetOpen(open); }}>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{editingItem ? 'Edit Merch Item' : 'Add Merch Item'}</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Image</label>
                            <div className="flex items-center gap-4">
                                {formData.thumbnail_url ? (
                                    <img
                                        src={formData.thumbnail_url}
                                        alt="Preview"
                                        className="w-20 h-20 object-cover rounded border"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded border bg-muted flex items-center justify-center">
                                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                )}
                                <div>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        id="merch-image-upload"
                                        onChange={handleImageChange}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.getElementById('merch-image-upload')?.click()}
                                        disabled={uploadingImage}
                                    >
                                        {uploadingImage ? (
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title *</label>
                            <Input
                                placeholder="e.g., Шлем Фубобомена"
                                value={formData.title}
                                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                placeholder="Short description shown on the card..."
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Input
                                    placeholder="APPAREL"
                                    value={formData.tag}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, tag: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Accent color</label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.color}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                                >
                                    {RISO_COLORS.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Sort order</label>
                            <Input
                                type="number"
                                value={formData.sort_order}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, sort_order: Number(e.target.value) }))
                                }
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm font-medium">
                            <Checkbox
                                checked={formData.published}
                                onChange={(e) => setFormData((prev) => ({ ...prev, published: e.target.checked }))}
                            />
                            Published (visible on the public site)
                        </label>
                    </div>

                    <SheetFooter>
                        <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving || uploadingImage}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving || uploadingImage}>
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
