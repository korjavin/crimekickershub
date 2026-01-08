import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import {
  listStoriesAdmin,
  getStory,
  createStory,
  updateStory,
  updateStoryMetadata,
  deleteStory,
  listMedia,
  getYouTubeThumbnail,
  addStoryItem,
  deleteStoryItem,
  getEntities,
  getEntities,
  listPromptVersions,
  createTextSlide,
} from '@/lib/api';
import type { Story, StoryItem, MediaAsset, StoryWithItems, Entity } from '@/lib/api-types';

interface SortableTimelineItemProps {
  item: StoryItem;
  onRemove: (item: StoryItem) => void;
  isRemoving: boolean;
}

function SortableTimelineItem({ item, onRemove, isRemoving }: SortableTimelineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const thumbnailUrl = item.media?.type === 'video' && item.media?.youtube_id
    ? getYouTubeThumbnail(item.media.youtube_id)
    : (item.media?.thumbnail_url || item.media?.url || '');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 bg-card border rounded-lg mb-2
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''}
        ${isRemoving ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <div
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </div>
      <span className="text-sm text-muted-foreground w-6">
        {item.sort_order + 1}
      </span>
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-16 h-12 object-cover rounded"
        />
      ) : item.media?.type === 'text' ? (
        <div className="w-16 h-12 bg-muted p-1 text-[10px] overflow-hidden rounded border">
          <div className="font-bold truncate">{item.media.title}</div>
        </div>
      ) : (
        <div className="w-16 h-12 bg-muted flex items-center justify-center rounded">
          ?
        </div>
      )}
      <div className="flex-1 min-w-0">
        <Badge variant="secondary" className="mb-1">
          {item.media?.type || 'unknown'}
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item);
        }}
        disabled={isRemoving}
      >
        ✕
      </Button>
    </div>
  );
}

interface MediaGridItemProps {
  media: MediaAsset;
  onAdd: (media: MediaAsset) => void;
  isAdding: boolean;
}

function MediaGridItem({ media, onAdd, isAdding }: MediaGridItemProps) {
  const thumbnailUrl = media.type === 'video' && media.youtube_id
    ? getYouTubeThumbnail(media.youtube_id)
    : (media.thumbnail_url || media.url || '');

  return (
    <Card className="overflow-hidden group relative">
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-24 object-cover"
        />
      ) : media.type === 'text' ? (
        <div className="w-full h-24 bg-muted p-2 text-xs overflow-hidden">
          <div className="font-bold truncate">{media.title}</div>
          <div className="text-muted-foreground line-clamp-3">{media.text_content}</div>
        </div>
      ) : (
        <div className="w-full h-24 bg-muted flex items-center justify-center">
          No preview
        </div>
      )}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button
          size="sm"
          onClick={() => onAdd(media)}
          disabled={isAdding}
        >
          {isAdding ? 'Adding...' : 'Add to Story'}
        </Button>
      </div>
      <div className="absolute top-1 right-1">
        <Badge variant="secondary" className="text-xs">
          {media.type}
        </Badge>
      </div>
    </Card>
  );
}

export function StoryEditorPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [storyWithItems, setStoryWithItems] = useState<StoryWithItems | null>(null);
  const [availableMedia, setAvailableMedia] = useState<MediaAsset[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');

  // Text Slide State
  const [isTextSlideDialogOpen, setIsTextSlideDialogOpen] = useState(false);
  const [textSlideTitle, setTextSlideTitle] = useState('');
  const [textSlideDescription, setTextSlideDescription] = useState('');
  const [textSlideContent, setTextSlideContent] = useState('');
  const [isCreatingTextSlide, setIsCreatingTextSlide] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addingMediaIds, setAddingMediaIds] = useState<Set<number>>(new Set());
  const [removingItemIds, setRemovingItemIds] = useState<Set<number>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load initial data
  useEffect(() => {
    loadStories();
    loadMedia();
    loadEntities();
  }, []);

  // Load story items when selected story changes
  useEffect(() => {
    if (selectedStoryId) {
      loadStory(selectedStoryId);
    }
  }, [selectedStoryId]);

  const loadStories = async () => {
    try {
      const data = await listStoriesAdmin();
      setStories(data);
    } catch (error) {
      console.error('Failed to load stories:', error);
      toast.error('Failed to load stories');
    }
  };

  const loadMedia = async () => {
    try {
      const data = await listMedia();
      setAvailableMedia(data);
    } catch (error) {
      console.error('Failed to load media:', error);
      toast.error('Failed to load media library');
    }
  };

  const loadEntities = async () => {
    try {
      const data = await getEntities();
      setEntities(data);
    } catch (error) {
      console.error('Failed to load entities:', error);
      toast.error('Failed to load entities');
    }
  };

  const loadStory = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await getStory(id);
      setStoryWithItems(data);
    } catch (error) {
      console.error('Failed to load story:', error);
      toast.error('Failed to load story details');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleCreateStory = async () => {
    if (!newStoryTitle.trim()) return;

    try {
      setIsLoading(true);
      const newStory = await createStory({
        title: newStoryTitle,
        slug: generateSlug(newStoryTitle),
      });

      await loadStories();
      setSelectedStoryId(String(newStory.id));
      setIsCreateDialogOpen(false);
      setNewStoryTitle('');

      toast.success('Story created successfully');
    } catch (error) {
      console.error('Failed to create story:', error);
      toast.error('Failed to create story. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToStory = async (media: MediaAsset) => {
    if (!storyWithItems) return;

    // Check if media is already in the story
    const isDuplicate = storyWithItems.items.some(
      (item) => item.media_asset_id === media.id
    );
    if (isDuplicate) {
      toast.warning('This media is already in the story');
      return;
    }

    try {
      setAddingMediaIds(prev => new Set(prev).add(media.id));
      const nextSortOrder = storyWithItems.items.length;

      // Call API to add item
      const newItem = await addStoryItem(
        String(storyWithItems.id),
        String(media.id),
        nextSortOrder
      );

      // Attach media object for display
      newItem.media = media;

      setStoryWithItems({
        ...storyWithItems,
        items: [...storyWithItems.items, newItem],
      });
      toast.success('Media added to story');
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to add media. Please try again.');
    } finally {
      setAddingMediaIds(prev => {
        const next = new Set(prev);
        next.delete(media.id);
        return next;
      });
    }
  };

  const handleRemoveFromStory = async (item: StoryItem) => {
    if (!storyWithItems) return;

    try {
      setRemovingItemIds(prev => new Set(prev).add(item.id));

      // Call API to remove item
      await deleteStoryItem(String(storyWithItems.id), String(item.id));

      const filteredItems = storyWithItems.items.filter(
        (i) => i.id !== item.id
      );

      // Recalculate sort orders locally
      const reorderedItems = filteredItems.map((item, index) => ({
        ...item,
        sort_order: index,
      }));

      setStoryWithItems({
        ...storyWithItems,
        items: reorderedItems,
      });

      toast.success('Item removed from story');
    } catch (error) {
      console.error('Failed to remove item:', error);
      toast.error('Failed to remove item. Please try again.');
    } finally {
      setRemovingItemIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleCreateTextSlide = async () => {
    if (!textSlideTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      setIsCreatingTextSlide(true);
      const newSlide = await createTextSlide({
        title: textSlideTitle,
        description: textSlideDescription,
        text_content: textSlideContent
      });

      setAvailableMedia(prev => [newSlide, ...prev]);
      setIsTextSlideDialogOpen(false);

      // Reset form
      setTextSlideTitle('');
      setTextSlideDescription('');
      setTextSlideContent('');

      toast.success("Text slide created");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create text slide");
    } finally {
      setIsCreatingTextSlide(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!storyWithItems) return;

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = storyWithItems.items.findIndex(
        (item) => item.id === active.id
      );
      const newIndex = storyWithItems.items.findIndex(
        (item) => item.id === over.id
      );

      const newItems = arrayMove(storyWithItems.items, oldIndex, newIndex);

      // Recalculate sort orders
      const reorderedItems = newItems.map((item, index) => ({
        ...item,
        sort_order: index,
      }));

      setStoryWithItems({
        ...storyWithItems,
        items: reorderedItems,
      });
    }
  };

  const handleSaveOrder = async () => {
    if (!storyWithItems) return;

    try {
      setIsSaving(true);
      const itemIds = storyWithItems.items.map((item) => item.id);
      await updateStory(String(storyWithItems.id), itemIds);
      // Reload to ensure sync
      await loadStory(String(storyWithItems.id));
      toast.success('Story order saved successfully');
    } catch (error) {
      console.error('Failed to save order:', error);
      toast.error('Failed to save order. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (checked: boolean) => {
    if (!storyWithItems) return;

    try {
      const updatedStory = await updateStoryMetadata(String(storyWithItems.id), {
        published: checked,
      });

      setStoryWithItems({
        ...storyWithItems,
        published: updatedStory.published,
      });

      // Also update the story in the stories list
      setStories(stories.map(s =>
        s.id === storyWithItems.id ? { ...s, published: updatedStory.published } : s
      ));

      toast.success(checked ? 'Story published successfully' : 'Story unpublished');
    } catch (error) {
      console.error('Failed to update publish status:', error);
      toast.error('Failed to update publish status. Please try again.');
    }
  };

  const handleDeleteStory = async () => {
    if (!storyWithItems) return;

    // Check if story has items
    if (storyWithItems.items.length > 0) {
      toast.error('Cannot delete story with slides. Remove all slides first.');
      return;
    }

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${storyWithItems.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteStory(String(storyWithItems.id));

      // Remove from stories list
      setStories(stories.filter(s => s.id !== storyWithItems.id));

      // Clear selected story
      setSelectedStoryId('');
      setStoryWithItems(null);

      toast.success('Story deleted successfully');
    } catch (error) {
      console.error('Failed to delete story:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete story';
      toast.error(errorMessage);
    }
  };

  // Filter media
  const filteredMedia = availableMedia.filter((media) => {
    // Search query filter
    const matchesSearch = !searchQuery ||
      media.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(media.id).includes(searchQuery);

    // Entity filter (requires looking up prompt version -> entity relation if we had it easily)
    // Currently media assets don't have direct entity link in the frontend DTO except via source_prompt_version_id
    // But we don't have the full prompt version map here efficiently.
    // Wait, the task implies "Show me Windman images".
    // I can assume if I have 'source_prompt_version_id', I might need to fetch prompt versions or check if the media DTO was enhanced.
    // The current `listMedia` returns `MediaAsset` which has `source_prompt_version_id`.
    // It doesn't have the entity ID directly.
    // However, `MediaPage.tsx` implemented a filter. Let's see how `MediaPage` did it.
    // It seems MediaPage also lacked direct entity link unless it fetched prompts.
    // Task 16 added `Recent prompts selector` but maybe not full traceability in the list.

    // For now, I will implement the filter logic if possible.
    // If not, I'll assume I need to fetch more data or skip it.
    // But the task is explicit.
    // Ideally, `listMedia` should return entity info.
    // Current `listMedia` calls `r.media.ListAssets`.
    // Let's assume for this task, I'll rely on what I have.
    // Use `searchQuery` for now as primary filter.
    // If I really need entity filter, I'd need to join tables in backend `ListMedia`.
    // BUT, the task says "Filter: By Entity".
    // I'll leave the UI for it, but if data is missing, it might not work fully without backend change.
    // Wait, let's look at `MediaPage` implementation in my memory or file list.
    // I'll just check `MediaPage.tsx` later if needed.
    // For now, I'll check if any media has entity info in name/metadata? No.

    // Actually, I can filter by "Entity" if I know which prompt version belongs to which entity.
    // I can fetch `listPromptVersions` which returns all versions with entity_id.
    // Then map media -> prompt_version -> entity.
    return matchesSearch;
  });

  // Advanced filtering with Entity map
  // To make entity filter work, we need a map of promptVersionId -> entityId
  const [promptVersionEntityMap, setPromptVersionEntityMap] = useState<Record<number, number>>({});

  useEffect(() => {
    const loadPromptVersionMap = async () => {
      try {
        const versions = await listPromptVersions();
        const map: Record<number, number> = {};
        versions.forEach((v: any) => {
          map[v.id] = v.entity_id;
        });
        setPromptVersionEntityMap(map);
      } catch (error) {
        console.error("Failed to load prompt versions for filter", error);
        // Silent fail - entity filter just won't work
      }
    };
    loadPromptVersionMap();
  }, []);

  const finalFilteredMedia = filteredMedia.filter(media => {
    if (selectedEntityId === 'all') return true;
    if (!media.source_prompt_version_id) return false;
    const entityId = promptVersionEntityMap[media.source_prompt_version_id];
    return String(entityId) === selectedEntityId;
  });

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Story Editor</h1>
          <p className="text-muted-foreground">
            Create and edit comic stories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedStoryId} onValueChange={setSelectedStoryId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select a story" />
            </SelectTrigger>
            <SelectContent>
              {stories.map((story) => (
                <SelectItem key={story.id} value={String(story.id)}>
                  {story.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ New Story</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Story</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <Input
                    value={newStoryTitle}
                    onChange={(e) => setNewStoryTitle(e.target.value)}
                    placeholder="Enter story title"
                  />
                </div>

              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateStory}
                  disabled={!newStoryTitle.trim() || isLoading}
                >
                  Create Story
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {storyWithItems && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                <Checkbox
                  id="publish-toggle"
                  checked={storyWithItems.published || false}
                  onChange={(e) => handleTogglePublish(e.target.checked)}
                />
                <label
                  htmlFor="publish-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  Published
                </label>
              </div>
              <Button
                variant="outline"
                onClick={handleDeleteStory}
                disabled={storyWithItems.items.length > 0}
                title={storyWithItems.items.length > 0 ? 'Remove all slides before deleting' : 'Delete this story'}
              >
                🗑️ Delete
              </Button>
            </>
          )}

          <Button
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            disabled={!storyWithItems || storyWithItems.items.length === 0}
          >
            📱 Preview
          </Button>
        </div>
      </div>

      {!selectedStoryId ? (
        <Card className="flex-1 flex items-center justify-center p-12 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg mb-2">No story selected</p>
            <p className="text-sm">
              Select an existing story or create a new one to get started
            </p>
          </div>
        </Card>
      ) : isLoading ? (
        <Card className="flex-1 flex items-center justify-center p-12 text-center">
          <div className="text-muted-foreground">Loading...</div>
        </Card>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* Left Column: Media Library */}
          <Card className="flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b space-y-4">
              <h2 className="text-lg font-semibold">Media Library</h2>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search media..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {entities.map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </Select>
                 <Dialog open={isTextSlideDialogOpen} onOpenChange={setIsTextSlideDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary"> + Text Slide</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Create Text Slide</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Title (Required)</label>
                        <Input 
                          placeholder="e.g., Chapter 1, Scene Setting" 
                          value={textSlideTitle}
                          onChange={e => setTextSlideTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-medium">Description (Optional)</label>
                         <Input 
                            placeholder="Short description for internal use"
                            value={textSlideDescription}
                            onChange={e => setTextSlideDescription(e.target.value)}
                         />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Content (Markdown supported)</label>
                        <textarea
                          className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="# A New Beginning..."
                          value={textSlideContent}
                          onChange={e => setTextSlideContent(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsTextSlideDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateTextSlide} disabled={isCreatingTextSlide || !textSlideTitle.trim()}>
                        {isCreatingTextSlide ? 'Creating...' : 'Create Slide'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {finalFilteredMedia.map((media) => (
                  <MediaGridItem
                    key={media.id}
                    media={media}
                    onAdd={handleAddToStory}
                    isAdding={addingMediaIds.has(media.id)}
                  />
                ))}
              </div>
              {finalFilteredMedia.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No media found
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Right Column: Timeline */ }
  <Card className="flex flex-col h-full overflow-hidden">
    <div className="p-4 border-b flex items-center justify-between">
      <h2 className="text-lg font-semibold">
        Story Timeline
        {storyWithItems && (
          <span className="text-muted-foreground font-normal ml-2">
            ({storyWithItems.items.length} frames)
          </span>
        )}
      </h2>
      <Button
        onClick={handleSaveOrder}
        disabled={isSaving || !storyWithItems?.items.length}
      >
        {isSaving ? 'Saving...' : 'Save Order'}
      </Button>
    </div>
    <ScrollArea className="flex-1 p-4 bg-muted/20">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={storyWithItems?.items.map((item) => item.id) || []}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {storyWithItems?.items.map((item) => (
              <SortableTimelineItem
                key={item.id}
                item={item}
                onRemove={handleRemoveFromStory}
                isRemoving={removingItemIds.has(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {(!storyWithItems?.items || storyWithItems.items.length === 0) && (
        <div className="text-center text-muted-foreground py-8">
          No frames yet. Add media from the left panel.
        </div>
      )}
    </ScrollArea>
  </Card>
        </div >
      )
}

{/* Preview Modal */ }
<Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
  <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
    <div className="p-4 border-b bg-muted/40 flex justify-between items-center">
      <h3 className="font-semibold">Mobile Preview</h3>
      <Button variant="ghost" size="sm" onClick={() => setIsPreviewOpen(false)}>✕</Button>
    </div>
    <ScrollArea className="flex-1 bg-black">
      <div className="flex flex-col">
        {storyWithItems?.items.map((item) => {
          const url = item.media?.url || '';

          if (item.media?.type === 'text') {
            return (
              <div key={item.id} className="w-full bg-white p-6 text-black min-h-[50vh] flex flex-col items-center justify-center text-center">
                <div className="prose prose-lg max-w-none">
                  {/* Simple rendering for preview, markdown rendering ideally in real reader */}
                  <h1 className="text-3xl font-bold mb-4">{item.media.title}</h1>
                  <div className="whitespace-pre-wrap">{item.media.text_content}</div>
                </div>
              </div>
            );
          }

          if (!url) return null;

          return (
            <div key={item.id} className="w-full">
              {item.media?.type === 'video' || (item.media?.youtube_id) ? (
                <div className="aspect-video w-full">
                  <iframe
                    src={item.media?.url}
                    className="w-full h-full"
                    title="Video"
                    allowFullScreen
                  />
                </div>
              ) : (
                <img
                  src={url}
                  alt="Comic Panel"
                  className="w-full h-auto block"
                  loading="lazy"
                />
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  </DialogContent>
</Dialog>
    </div >
  );
}
