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
import { listMedia, listPromptVersions, uploadMedia } from '@/lib/api';
import type { MediaAsset, PromptVersion } from '@/lib/api-types';
import { Upload, FileImage, X, Search, Loader2 } from 'lucide-react';

export function MediaPage() {
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [isUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPromptVersionId, setSelectedPromptVersionId] = useState<string>('');
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  // Load media assets and prompt versions on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mediaData, versionsData] = await Promise.all([
        listMedia(),
        listPromptVersions(),
      ]);
      setMediaAssets(mediaData);
      setPromptVersions(versionsData);
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
      // Upload the first valid file
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
    setUploadProgress(0);

    try {
      await uploadMedia(selectedFile, selectedPromptVersionId || undefined);
      
      // Close modal and reload data
      setMetadataModalOpen(false);
      await loadData();
      
      // Reset state
      setSelectedFile(null);
      setSelectedPromptVersionId('');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsSavingMetadata(false);
      setUploadProgress(0);
    }
  };

  // Filter media assets based on search
  const filteredAssets = mediaAssets.filter(asset => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      asset.type?.toLowerCase().includes(query) ||
      asset.r2_key?.toLowerCase().includes(query) ||
      asset.youtube_id?.toLowerCase().includes(query)
    );
  });

  // Get prompt version display name
  const getPromptVersionDisplay = (version: PromptVersion) => {
    const entityName = version.entity?.name || 'Unknown';
    const typeName = version.type?.slug || 'Unknown';
    const versionNum = version.version_number;
    return `${entityName} - ${typeName} (v${versionNum})`;
  };

  // Get prompt version by ID
  const getPromptVersionById = (id: number): PromptVersion | undefined => {
    return promptVersions.find(v => v.id === id);
  };

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

          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading... {uploadProgress}%</span>
            </div>
          )}
        </div>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search media..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAssets.map((asset) => (
          <Card key={asset.id} className="overflow-hidden group">
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

              {/* Delete button (placeholder) */}
              <button
                className="absolute top-2 right-2 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  if (confirm('Delete this media asset?')) {
                    // TODO: Implement delete
                    console.log('Delete asset:', asset.id);
                  }
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
              {asset.source_prompt_version_id && (
                <div className="text-xs">
                  <span className="text-muted-foreground">From: </span>
                  {(() => {
                    const pv = getPromptVersionById(asset.source_prompt_version_id);
                    return pv ? (
                      <span className="font-medium" title={pv.prompt_text}>
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
                  {new Date(asset.created_at).toLocaleDateString()}
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

      {/* Metadata Modal */}
      <Dialog open={metadataModalOpen} onOpenChange={setMetadataModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Prompt Version</DialogTitle>
            <DialogDescription>
              Optionally link this image to the prompt version that generated it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File info */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Selected file:</p>
              <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile?.size || 0 / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            {/* Prompt version dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Which Prompt Version created this?
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
                  {promptVersions.map((version) => (
                    <SelectItem key={version.id} value={version.id.toString()}>
                      {getPromptVersionDisplay(version)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}
