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
    getGamesAdmin,
    createGame,
    updateGame,
    deleteGame,
    type Game,
    type GameInput,
} from '@/lib/api';
import { Plus, Search, Edit2, Trash2, Loader2, Gamepad2, EyeOff, ExternalLink } from 'lucide-react';

const RISO_COLORS = ['pink', 'blue', 'mustard', 'violet', 'teal', 'coral', 'mint'];

interface GameFormData {
    title: string;
    url: string;
    description: string;
    thumbnail_url: string;
    tag: string;
    color: string;
    sort_order: number;
    published: boolean;
}

const initialFormData: GameFormData = {
    title: '',
    url: '',
    description: '',
    thumbnail_url: '',
    tag: '',
    color: 'pink',
    sort_order: 0,
    published: true,
};

export function GamesPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingGame, setEditingGame] = useState<Game | null>(null);
    const [formData, setFormData] = useState<GameFormData>(initialFormData);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadGames();
    }, []);

    const loadGames = async () => {
        setLoading(true);
        try {
            const data = await getGamesAdmin();
            setGames(data || []);
        } catch (error) {
            console.error('Failed to load games:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateSheet = () => {
        setEditingGame(null);
        const nextOrder = games.reduce((max, g) => Math.max(max, g.sort_order), 0) + 1;
        setFormData({ ...initialFormData, sort_order: nextOrder });
        setSheetOpen(true);
    };

    const openEditSheet = (game: Game) => {
        setEditingGame(game);
        setFormData({
            title: game.title,
            url: game.url,
            description: game.description || '',
            thumbnail_url: game.thumbnail_url || '',
            tag: game.tag || '',
            color: game.color || 'pink',
            sort_order: game.sort_order,
            published: game.published,
        });
        setSheetOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            alert('Title is required');
            return;
        }
        if (!formData.url.trim()) {
            alert('URL is required');
            return;
        }

        setSaving(true);
        try {
            const apiData: GameInput = {
                title: formData.title.trim(),
                url: formData.url.trim(),
                description: formData.description,
                thumbnail_url: formData.thumbnail_url.trim(),
                tag: formData.tag,
                color: formData.color,
                sort_order: Number(formData.sort_order) || 0,
                published: formData.published,
            };

            if (editingGame) {
                await updateGame(editingGame.id, apiData);
            } else {
                await createGame(apiData);
            }
            setSheetOpen(false);
            await loadGames();
        } catch (error) {
            console.error('Failed to save game:', error);
            alert('Failed to save game');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (game: Game) => {
        if (!confirm(`Delete "${game.title}"? This removes it from the Games tab.`)) {
            return;
        }
        try {
            await deleteGame(game.id);
            await loadGames();
        } catch (error) {
            console.error('Failed to delete game:', error);
            alert('Failed to delete game');
        }
    };

    const filteredGames = games.filter(
        (g) =>
            g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (g.tag || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (g.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Gamepad2 className="w-8 h-8" />
                    Games
                </h1>
                <p className="text-muted-foreground">
                    Manage the cards shown on the public Games tab. Each card links out to a game hosted somewhere else.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search games..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button onClick={openCreateSheet}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Game
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
                                <TableHead className="w-[120px]">Preview</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Link</TableHead>
                                <TableHead className="w-[80px]">Order</TableHead>
                                <TableHead className="w-[100px]">Status</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredGames.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No games yet. Click "Add Game" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredGames.map((game) => (
                                    <TableRow key={game.id}>
                                        <TableCell>
                                            {game.thumbnail_url ? (
                                                <img
                                                    src={game.thumbnail_url}
                                                    alt={game.title}
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
                                        <TableCell className="font-medium">{game.title}</TableCell>
                                        <TableCell className="text-xs font-mono uppercase">
                                            {game.tag || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <a
                                                href={game.url}
                                                target="_blank"
                                                rel="noreferrer noopener"
                                                className="text-primary inline-flex items-center gap-1 underline"
                                            >
                                                open <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{game.sort_order}</TableCell>
                                        <TableCell>
                                            {game.published ? (
                                                <span className="text-xs text-green-600 font-medium">Published</span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <EyeOff className="w-3 h-3" /> Hidden
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEditSheet(game)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(game)}>
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

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>{editingGame ? 'Edit Game' : 'Add Game'}</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title *</label>
                            <Input
                                placeholder="e.g., Pho-boman: Broth Brawl"
                                value={formData.title}
                                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">URL *</label>
                            <Input
                                placeholder="https://example.com/games/..."
                                value={formData.url}
                                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Thumbnail / screenshot URL</label>
                            <Input
                                placeholder="https://...png"
                                value={formData.thumbnail_url}
                                onChange={(e) => setFormData((prev) => ({ ...prev, thumbnail_url: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                placeholder="Short blurb shown on the card..."
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Input
                                    placeholder="ARCADE"
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
