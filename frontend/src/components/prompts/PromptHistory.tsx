import { useState, useEffect, useMemo } from 'react';
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
import { listPromptHistory, getPromptDiff } from '@/lib/api';
import type { PromptVersion } from '@/lib/api-types';
import { Search, GitCompare, ArrowRight, Loader2 } from 'lucide-react';

interface PromptHistoryProps {
    onCreateVersion?: (version: PromptVersion) => void;
}

export function PromptHistory({ onCreateVersion }: PromptHistoryProps) {
    const [history, setHistory] = useState<PromptVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('all');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

    // Diff state
    const [diffMode, setDiffMode] = useState(false);
    const [selectedVersionA, setSelectedVersionA] = useState<number | null>(null);
    const [selectedVersionB, setSelectedVersionB] = useState<number | null>(null);
    const [diffResult, setDiffResult] = useState<string | null>(null);
    const [loadingDiff, setLoadingDiff] = useState(false);

    // Expansion state
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await listPromptHistory();
            setHistory(data || []);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get unique filter options
    const filterOptions = useMemo(() => {
        const entities = new Set<string>();
        const types = new Set<string>();
        const entityMap = new Map<string, string>(); // name -> id

        history.forEach(v => {
            // Handle flattened DTO structure from listPromptHistory
            const entityName = (v as any).entity_name || v.entity?.name;
            const typeSlug = (v as any).type_slug || v.type?.slug;
            const entityId = (v as any).entity_id || v.entity_id;

            if (entityName) {
                entities.add(entityName);
                entityMap.set(entityName, entityId?.toString());
            }
            if (typeSlug) types.add(typeSlug);
        });

        return {
            entities: Array.from(entities).sort(),
            types: Array.from(types).sort(),
            entityMap
        };
    }, [history]);

    // Filtered list
    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            const entityName = (item as any).entity_name || item.entity?.name || '';
            const typeSlug = (item as any).type_slug || item.type?.slug || '';
            const promptText = item.prompt_text || '';

            // Search
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                entityName.toLowerCase().includes(searchLower) ||
                typeSlug.toLowerCase().includes(searchLower) ||
                promptText.toLowerCase().includes(searchLower);

            if (!matchesSearch) return false;

            // Type Filter
            if (selectedTypeFilter !== 'all' && typeSlug !== selectedTypeFilter) return false;

            // Entity Filter
            if (selectedEntityFilter !== 'all' && entityName !== selectedEntityFilter) return false;

            return true;
        });
    }, [history, searchQuery, selectedEntityFilter, selectedTypeFilter]);

    // Handle Diff
    const handleCompare = async () => {
        if (!selectedVersionA || !selectedVersionB) return;

        setLoadingDiff(true);
        try {
            const result = await getPromptDiff(selectedVersionA, selectedVersionB);
            setDiffResult(result.diff);
        } catch (error) {
            console.error('Failed to get diff:', error);
            setDiffResult('Failed to load diff.');
        } finally {
            setLoadingDiff(false);
        }
    };

    const toggleDiffSelection = (id: number) => {
        if (selectedVersionA === id) {
            setSelectedVersionA(null);
        } else if (selectedVersionB === id) {
            setSelectedVersionB(null);
        } else if (selectedVersionA === null) {
            setSelectedVersionA(id);
        } else if (selectedVersionB === null) {
            setSelectedVersionB(id);
        } else {
            // Replace the oldest selection (A)
            setSelectedVersionA(selectedVersionB);
            setSelectedVersionB(id);
        }
    };

    const toggleExpand = (id: number) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedIds(newSet);
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex gap-2 flex-1 w-full sm:w-auto">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search history..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {filterOptions.types.map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedEntityFilter} onValueChange={setSelectedEntityFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Subject" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Subjects</SelectItem>
                            {filterOptions.entities.map(e => (
                                <SelectItem key={e} value={e}>{e}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2 items-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadHistory}
                        disabled={loading}
                    >
                        <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        variant={diffMode ? "secondary" : "outline"}
                        onClick={() => {
                            setDiffMode(!diffMode);
                            setDiffResult(null);
                            setSelectedVersionA(null);
                            setSelectedVersionB(null);
                        }}
                        size="sm"
                    >
                        <GitCompare className="w-4 h-4 mr-2" />
                        {diffMode ? 'Exit Diff Mode' : 'Compare Versions'}
                    </Button>
                </div>
            </div>

            {diffMode && (
                <Card className="p-4 bg-slate-50 border-dashed">
                    <div className="flex items-center justify-between mb-4">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-sm">Compare Prompts</h3>
                            <p className="text-xs text-muted-foreground">Select two versions from the list below to verify changes.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={selectedVersionA ? "default" : "outline"}>
                                {selectedVersionA ? `Version #${selectedVersionA}` : "Select A"}
                            </Badge>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <Badge variant={selectedVersionB ? "default" : "outline"}>
                                {selectedVersionB ? `Version #${selectedVersionB}` : "Select B"}
                            </Badge>
                            <Button
                                size="sm"
                                disabled={!selectedVersionA || !selectedVersionB || loadingDiff}
                                onClick={handleCompare}
                            >
                                {loadingDiff ? <Loader2 className="w-3 h-3 animate-spin" /> : "Run Diff"}
                            </Button>
                        </div>
                    </div>

                    {diffResult && (
                        <div className="mt-4 p-4 bg-background rounded border font-mono text-sm whitespace-pre-wrap max-h-[400px] overflow-auto">
                            {diffResult}
                        </div>
                    )}
                </Card>
            )}

            {/* List */}
            <div className="grid gap-3">
                {filteredHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No history found matching filters.</div>
                ) : (
                    filteredHistory.map((version) => {
                        const entityName = (version as any).entity_name || version.entity?.name;
                        const typeSlug = (version as any).type_slug || version.type?.slug;
                        const isSelected = selectedVersionA === version.id || selectedVersionB === version.id;

                        return (
                            <div
                                key={version.id}
                                className={`
                  group relative flex flex-col sm:flex-row gap-4 p-4 rounded-lg border bg-card transition-all
                  ${diffMode ? 'cursor-pointer hover:border-primary/50' : ''}
                  ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}
                `}
                                onClick={() => diffMode && toggleDiffSelection(version.id)}
                            >
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">v{version.version_number}</Badge>
                                        <span className="font-medium">{entityName}</span>
                                        <span className="text-muted-foreground">/</span>
                                        <span className="font-mono text-xs text-muted-foreground">{typeSlug}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {version.created_at ? new Date(version.created_at).toLocaleString() : 'Unknown date'}
                                        </span>
                                    </div>
                                    <div
                                        className={`text-sm text-foreground/80 font-mono bg-muted/30 p-2 rounded cursor-pointer transition-all ${expandedIds.has(version.id) ? '' : 'line-clamp-2'}`}
                                        onClick={(e) => {
                                            if (!diffMode) {
                                                e.stopPropagation();
                                                toggleExpand(version.id);
                                            }
                                        }}
                                    >
                                        {version.prompt_text}
                                    </div>
                                    {!diffMode && (
                                        <button
                                            className="text-xs text-muted-foreground hover:text-foreground mt-1 underline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpand(version.id);
                                            }}
                                        >
                                            {expandedIds.has(version.id) ? 'Show Less' : 'Show More'}
                                        </button>
                                    )}
                                </div>

                                {!diffMode && (
                                    <div className="flex items-center">
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            // Could add "Restore" or "Copy" functionality here
                                            navigator.clipboard.writeText(version.prompt_text);
                                        }}>
                                            Copy
                                        </Button>
                                        {onCreateVersion && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="ml-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCreateVersion(version);
                                                }}
                                            >
                                                Create New Version
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
