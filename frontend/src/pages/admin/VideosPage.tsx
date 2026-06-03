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
    getVideosAdmin,
    createVideo,
    updateVideo,
    deleteVideo,
    getYouTubeThumbnail,
    type Video,
    type VideoInput,
} from '@/lib/api';
import { Plus, Search, Edit2, Trash2, Loader2, Film, EyeOff } from 'lucide-react';

const RISO_COLORS = ['pink', 'blue', 'mustard', 'violet', 'teal', 'coral', 'mint'];

interface VideoFormData {
    title: string;
    youtube_id: string;
    description: string;
    mins: string;
    tag: string;
    color: string;
    tags: string; // comma-separated in the form
    sort_order: number;
    published: boolean;
}

const initialFormData: VideoFormData = {
    title: '',
    youtube_id: '',
    description: '',
    mins: '',
    tag: '',
    color: 'pink',
    tags: '',
    sort_order: 0,
    published: true,
};

export function VideosPage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Sheet state
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);
    const [formData, setFormData] = useState<VideoFormData>(initialFormData);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        setLoading(true);
        try {
            const data = await getVideosAdmin();
            setVideos(data || []);
        } catch (error) {
            console.error('Failed to load videos:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateSheet = () => {
        setEditingVideo(null);
        // Default new videos to the end of the current list.
        const nextOrder = videos.reduce((max, v) => Math.max(max, v.sort_order), 0) + 1;
        setFormData({ ...initialFormData, sort_order: nextOrder });
        setSheetOpen(true);
    };

    const openEditSheet = (video: Video) => {
        setEditingVideo(video);
        setFormData({
            title: video.title,
            youtube_id: video.youtube_id,
            description: video.description || '',
            mins: video.mins || '',
            tag: video.tag || '',
            color: video.color || 'pink',
            tags: (video.tags || []).join(', '),
            sort_order: video.sort_order,
            published: video.published,
        });
        setSheetOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            alert('Title is required');
            return;
        }
        if (!formData.youtube_id.trim()) {
            alert('YouTube link or ID is required');
            return;
        }

        setSaving(true);
        try {
            const apiData: VideoInput = {
                title: formData.title.trim(),
                youtube_id: formData.youtube_id.trim(),
                description: formData.description,
                mins: formData.mins,
                tag: formData.tag,
                color: formData.color,
                tags: formData.tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                sort_order: Number(formData.sort_order) || 0,
                published: formData.published,
            };

            if (editingVideo) {
                await updateVideo(editingVideo.id, apiData);
            } else {
                await createVideo(apiData);
            }
            setSheetOpen(false);
            await loadVideos();
        } catch (error) {
            console.error('Failed to save video:', error);
            alert('Failed to save video');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (video: Video) => {
        if (!confirm(`Delete "${video.title}"? This removes it from the Cinema tab.`)) {
            return;
        }
        try {
            await deleteVideo(video.id);
            await loadVideos();
        } catch (error) {
            console.error('Failed to delete video:', error);
            alert('Failed to delete video');
        }
    };

    const filteredVideos = videos.filter(
        (v) =>
            v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.tag || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Film className="w-8 h-8" />
                    Videos
                </h1>
                <p className="text-muted-foreground">
                    Manage the reels shown on the public Cinema tab. Paste a YouTube link or ID.
                </p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button onClick={openCreateSheet}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Video
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
                                <TableHead className="w-[120px]">Preview</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead className="w-[80px]">Order</TableHead>
                                <TableHead className="w-[100px]">Status</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredVideos.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No videos yet. Click "Add Video" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredVideos.map((video) => (
                                    <TableRow key={video.id}>
                                        <TableCell>
                                            <img
                                                src={getYouTubeThumbnail(video.youtube_id)}
                                                alt={video.title}
                                                className="w-[100px] h-[56px] object-cover rounded border"
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {video.title}
                                            {video.mins && (
                                                <span className="ml-2 text-xs text-muted-foreground font-mono">
                                                    {video.mins}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs font-mono uppercase">
                                            {video.tag || '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {(video.tags || []).join(', ') || '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{video.sort_order}</TableCell>
                                        <TableCell>
                                            {video.published ? (
                                                <span className="text-xs text-green-600 font-medium">Published</span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <EyeOff className="w-3 h-3" /> Hidden
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEditSheet(video)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(video)}>
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
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{editingVideo ? 'Edit Video' : 'Add Video'}</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title *</label>
                            <Input
                                placeholder="e.g., Pho-boman trailer"
                                value={formData.title}
                                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">YouTube link or ID *</label>
                            <Input
                                placeholder="https://youtu.be/… or dQw4w9WgXcQ"
                                value={formData.youtube_id}
                                onChange={(e) => setFormData((prev) => ({ ...prev, youtube_id: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                placeholder="Short blurb shown under the player..."
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Duration label</label>
                                <Input
                                    placeholder="1:24"
                                    value={formData.mins}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, mins: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Input
                                    placeholder="TRAILER"
                                    value={formData.tag}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, tag: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
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
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Filter tags (comma-separated)</label>
                            <Input
                                placeholder="trailer, action"
                                value={formData.tags}
                                onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
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
                        <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
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
