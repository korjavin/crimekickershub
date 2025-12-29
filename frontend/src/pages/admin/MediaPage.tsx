import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
} from '@/components/ui/sheet';
import { listMedia, listRecentPromptVersions, uploadMedia, getEntities } from '@/lib/api';
import type { MediaAsset, PromptVersion, Entity } from '@/lib/api-types';
import { Upload, FileImage, Search, Loader2, Copy, Clock, Link2, Eye } from 'lucide-react';

export function MediaPage() {
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [recentVersions, setRecentVersions] = useState<PromptVersion[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  
  // Upload modal state
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPromptVersionId, setSelectedPromptVersionId] = useState<string>('');
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  
  // Detail sheet state
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mediaData, versionsData, entitiesData] = await Promise.all([
        listMedia(),
        listRecentPromptVersions(),
        getEntities(),
      ]);
      setMediaAssets(mediaData || []);
      setRecentVersions(versionsData || []);
      setEntities(entitiesData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length > 0) {
      openMetadataModal(validFiles[0]);
    }
  }, []);

  // Handle file selection via input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      openMetadataModal(files[0]);
    }
  };

  // Open metadata modal with selected file
  const openMetadataModal = (file: File) => {
    setSelectedFile(file);
    setMetadataModalOpen(true);
    setSelectedPromptVersionId('');
  };

  // Upload file with metadata
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsSavingMetadata(true);

    try {
      await uploadMedia(selectedFile, selectedPromptVersionId || undefined);
      
      setMetadataModalOpen(false);
      await loadData();
      
      setSelectedFile(null);
      setSelectedPromptVersionId('');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsSavingMetadata(false);
    }
  };

  // Open asset detail sheet
  const openDetailSheet = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    setDetailSheetOpen(true);
    setCopiedPrompt(false);
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = () => {
    if (selectedAsset?.source_prompt_version_id && recentVersions.length > 0) {
      const version = recentVersions.find(v => v.id === selectedAsset.source_prompt_version_id);
      if (version) {
        navigator.clipboard.writeText(version.prompt_text || '');
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      }
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get prompt version display name
  const getPromptVersionDisplay = (version: PromptVersion) => {
    const entityName = (version as any).entity_name || version.entity?.name || 'Unknown';
    const typeName = (version as any).type_slug || version.type?.slug || 'Unknown';
    const versionNum = version.version_number;
    return `${entityName} - ${typeName} (v${versionNum})`;
  };

  // Filter media assets
  const filteredAssets = mediaAssets.filter(asset => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        asset.type?.toLowerCase().includes(query) ||
        asset.r2_key?.toLowerCase().includes(query) ||
        asset.youtube_id?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Entity filter
    if (entityFilter !== 'all') {
      const entityId = parseInt(entityFilter);
      // Check if asset is linked to this entity via prompt version
      if (asset.source_prompt_version_id) {
        const version = recentVersions.find(v => v.id === asset.source_prompt_version_id);
        if (version && (version as any).entity_id !== entityId) {
          return false;
        }
      } else {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Media Assets</h1>
        <p className="text-muted-foreground">
          Upload and manage images and videos for your comic universe
        </p>
      </div>

      {/* Upload Zone */}
      <Card 
        className={`
          border-2 border-dashed p-8 text-center transition-colors
          ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`
            p-4 rounded-full transition-colors
            ${dragActive ? 'bg-primary/10' : 'bg-muted'}
          `}>
            <Upload className={`w-8 h-8 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          
          <div>
            <p className="text-lg font-medium">
              {dragActive ? 'Drop your image here' : 'Drag & drop images here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse
            </p>
          </div>

          <Input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id="file-upload"
            onChange={handleFileSelect}
          />
          
          <Button
            variant="outline"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            Select Images
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entities.map(entity => (
                <SelectItem key={entity.id} value={entity.id.toString()}>
                  {entity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAssets.map((asset) => (
          <Card 
            key={asset.id} 
            className="overflow-hidden group cursor-pointer"
            onClick={() => openDetailSheet(asset)}
          >
            {/* Thumbnail */}
            <div className="aspect-square bg-muted relative">
              {asset.thumbnail_url || asset.url ? (
                <img
                  src={asset.thumbnail_url || asset.url}
                  alt={`Media ${asset.id}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileImage className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Type badge */}
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="capitalize">
                  {asset.type}
                </Badge>
              </div>

              {/* View button overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Eye className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
              {asset.source_prompt_version_id && (
                <div className="text-xs">
                  <span className="text-muted-foreground">From: </span>
                  {(() => {
                    const pv = recentVersions.find(v => v.id === asset.source_prompt_version_id);
                    return pv ? (
                      <span className="font-medium">
                        {getPromptVersionDisplay(pv)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    );
                  })()}
                </div>
              )}
              
              {asset.created_at && (
                <p className="text-xs text-muted-foreground">
                  {formatTimeAgo(asset.created_at)}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredAssets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileImage className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No media assets found</p>
          <p className="text-sm">Upload your first image to get started</p>
        </div>
      )}

      {/* Upload Metadata Modal */}
      <Dialog open={metadataModalOpen} onOpenChange={setMetadataModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Prompt Version</DialogTitle>
            <DialogDescription>
              Select which prompt version generated this image (optional).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File info */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Selected file:</p>
              <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
            </div>

            {/* Recent prompts selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Prompts
              </label>
              <Select
                value={selectedPromptVersionId}
                onValueChange={setSelectedPromptVersionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a prompt version (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None / Manual upload</SelectItem>
                  {recentVersions.map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{getPromptVersionDisplay(version)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatTimeAgo(version.created_at || '')}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Shows your 10 most recently created/edited prompts
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMetadataModalOpen(false)}
              disabled={isSavingMetadata}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isSavingMetadata}
            >
              {isSavingMetadata ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle>Media Details</SheetTitle>
          </SheetHeader>

          {selectedAsset && (
            <div className="space-y-6 py-4">
              {/* Preview */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {selectedAsset.thumbnail_url || selectedAsset.url ? (
                  <img
                    src={selectedAsset.thumbnail_url || selectedAsset.url}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileImage className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="secondary" className="capitalize">
                    {selectedAsset.type}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uploaded</span>
                  <span className="text-sm">
                    {selectedAsset.created_at ? formatTimeAgo(selectedAsset.created_at) : '-'}
                  </span>
                </div>

                {selectedAsset.youtube_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">YouTube</span>
                    <a 
                      href={`https://youtu.be/${selectedAsset.youtube_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedAsset.youtube_id}
                    </a>
                  </div>
                )}
              </div>

              {/* Source Link */}
              {selectedAsset.source_prompt_version_id && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Link2 className="w-4 h-4" />
                    Generated from
                  </div>
                  {(() => {
                    const version = recentVersions.find(v => v.id === selectedAsset.source_prompt_version_id);
                    if (!version) return null;
                    
                    return (
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge>{getPromptVersionDisplay(version)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {version.created_at ? formatTimeAgo(version.created_at) : ''}
                          </span>
                        </div>
                        {version.prompt_text && (
                          <div className="text-xs text-muted-foreground line-clamp-3">
                            {version.prompt_text}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={handleCopyPrompt}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Delete button */}
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    if (confirm('Delete this media asset?')) {
                      // TODO: Implement delete
                      console.log('Delete asset:', selectedAsset.id);
                      setDetailSheetOpen(false);
                    }
                  }}
                >
                  Delete Asset
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
