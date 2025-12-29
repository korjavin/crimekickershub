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
import {
  listStoriesAdmin,
  getStory,
  createStory,
  updateStory,
  listMedia,
  getYouTubeThumbnail,
} from '@/lib/api';
import type { Story, StoryItem, MediaAsset, StoryWithItems } from '@/lib/api-types';

interface SortableTimelineItemProps {
  item: StoryItem;
  onRemove: (id: number) => void;
}

function SortableTimelineItem({ item, onRemove }: SortableTimelineItemProps) {
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
      `}
      {...attributes}
      {...listeners}
    >
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground">
        ⋮⋮
      </div>
      <span className="text-sm text-muted-foreground w-6">
        {item.sort_order + 1}
      </span>
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt=""
          className="w-16 h-12 object-cover rounded"
        />
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
          onRemove(item.id);
        }}
      >
        ✕
      </Button>
    </div>
  );
}

interface MediaGridItemProps {
  media: MediaAsset;
  onAdd: (media: MediaAsset) => void;
  isDisabled: boolean;
}

function MediaGridItem({ media, onAdd, isDisabled }: MediaGridItemProps) {
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
      ) : (
        <div className="w-full h-24 bg-muted flex items-center justify-center">
          No preview
        </div>
      )}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button
          size="sm"
          onClick={() => onAdd(media)}
          disabled={isDisabled}
        >
          Add to Story
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

export function StoryBuilderPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [storyWithItems, setStoryWithItems] = useState<StoryWithItems | null>(null);
  const [availableMedia, setAvailableMedia] = useState<MediaAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStorySlug, setNewStorySlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load stories and media on mount
  useEffect(() => {
    loadStories();
    loadMedia();
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
    }
  };

  const loadMedia = async () => {
    try {
      const data = await listMedia();
      setAvailableMedia(data);
    } catch (error) {
      console.error('Failed to load media:', error);
    }
  };

  const loadStory = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await getStory(id);
      setStoryWithItems(data);
    } catch (error) {
      console.error('Failed to load story:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStory = async () => {
    if (!newStoryTitle.trim()) return;
    
    try {
      setIsLoading(true);
      const newStory = await createStory({
        title: newStoryTitle,
        slug: newStorySlug || undefined,
      });
      
      await loadStories();
      setSelectedStoryId(String(newStory.id));
      setIsCreateDialogOpen(false);
      setNewStoryTitle('');
      setNewStorySlug('');
    } catch (error) {
      console.error('Failed to create story:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToStory = (media: MediaAsset) => {
    if (!storyWithItems) return;
    
    // Check if already in story
    const exists = storyWithItems.items.some(
      (item) => item.media_asset_id === media.id
    );
    if (exists) return;

    const newItem: StoryItem = {
      id: Date.now(), // Temporary ID
      story_id: storyWithItems.id,
      media_asset_id: media.id,
      sort_order: storyWithItems.items.length,
      media,
    };

    setStoryWithItems({
      ...storyWithItems,
      items: [...storyWithItems.items, newItem],
    });
  };

  const handleRemoveFromStory = (itemId: number) => {
    if (!storyWithItems) return;

    const filteredItems = storyWithItems.items.filter(
      (item) => item.id !== itemId
    );

    // Recalculate sort orders
    const reorderedItems = filteredItems.map((item, index) => ({
      ...item,
      sort_order: index,
    }));

    setStoryWithItems({
      ...storyWithItems,
      items: reorderedItems,
    });
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
      const itemIds = storyWithItems.items.map((item) => String(item.id));
      await updateStory(String(storyWithItems.id), itemIds);
      await loadStory(String(storyWithItems.id));
    } catch (error) {
      console.error('Failed to save order:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter media by search query
  const filteredMedia = availableMedia.filter((media) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      media.type.toLowerCase().includes(query) ||
      String(media.id).includes(query)
    );
  });

  // Get IDs of media already in story
  const storyMediaIds = new Set(
    storyWithItems?.items.map((item) => item.media_asset_id) || []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Story Builder</h1>
          <p className="text-muted-foreground">
            Create and edit comic stories by arranging media frames
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
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Slug (optional)
                  </label>
                  <Input
                    value={newStorySlug}
                    onChange={(e) => setNewStorySlug(e.target.value)}
                    placeholder="auto-generated if empty"
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
        </div>
      </div>

      {!selectedStoryId ? (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg mb-2">No story selected</p>
            <p className="text-sm">
              Select an existing story or create a new one to get started
            </p>
          </div>
        </Card>
      ) : isLoading ? (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">Loading...</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Media Panel */}
          <Card className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Available Media</h2>
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[500px] pr-4">
              <div className="grid grid-cols-3 gap-2">
                {filteredMedia.map((media) => (
                  <MediaGridItem
                    key={media.id}
                    media={media}
                    onAdd={handleAddToStory}
                    isDisabled={storyMediaIds.has(media.id)}
                  />
                ))}
              </div>
              {filteredMedia.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No media found
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Story Timeline Panel */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
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
            <ScrollArea className="h-[500px] pr-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={storyWithItems?.items.map((item) => item.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  {storyWithItems?.items.map((item) => (
                    <SortableTimelineItem
                      key={item.id}
                      item={item}
                      onRemove={handleRemoveFromStory}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {(!storyWithItems?.items || storyWithItems.items.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  No frames yet. Add media from the left panel.
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  );
}
