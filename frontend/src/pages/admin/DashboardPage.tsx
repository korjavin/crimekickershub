import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

import { getDashboardActivity } from '@/lib/api';
import { Link } from 'react-router-dom';
import {
    Loader2,
    Activity,
    User,
    Image as ImageIcon,
    BookOpen,
    MessageSquare,
    Plus,
    Upload
} from 'lucide-react';

interface ActivityItem {
    id: number;
    type: 'entity' | 'prompt' | 'media' | 'story';
    title: string;
    subtitle?: string;
    created_at: string;
    link: string;
}

export function DashboardPage() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivity();
    }, []);

    const loadActivity = async () => {
        try {
            const data = await getDashboardActivity();
            setActivities(data);
        } catch (error) {
            console.error('Failed to load dashboard activity:', error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'entity': return <User className="w-4 h-4 text-blue-500" />;
            case 'prompt': return <MessageSquare className="w-4 h-4 text-green-500" />;
            case 'media': return <ImageIcon className="w-4 h-4 text-purple-500" />;
            case 'story': return <BookOpen className="w-4 h-4 text-orange-500" />;
            default: return <Activity className="w-4 h-4 text-gray-500" />;
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Overview of your Crime Kickers Hub</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Link to="/admin/entities">
                    <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <User className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                        </div>
                        <div>
                            <p className="font-medium">New Entity</p>
                            <p className="text-xs text-muted-foreground">Create character</p>
                        </div>
                    </Card>
                </Link>
                <Link to="/admin/media">
                    <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                            <Upload className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                        </div>
                        <div>
                            <p className="font-medium">Upload Media</p>
                            <p className="text-xs text-muted-foreground">Add images/videos</p>
                        </div>
                    </Card>
                </Link>
                <Link to="/admin/matrix">
                    <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                            <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-300" />
                        </div>
                        <div>
                            <p className="font-medium">Prompt Matrix</p>
                            <p className="text-xs text-muted-foreground">Manage prompts</p>
                        </div>
                    </Card>
                </Link>
                <Link to="/admin/stories">
                    <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                            <Plus className="w-6 h-6 text-orange-600 dark:text-orange-300" />
                        </div>
                        <div>
                            <p className="font-medium">New Story</p>
                            <p className="text-xs text-muted-foreground">Create comic</p>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Activity Feed */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Recent Activity</h2>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                        No recent activity found. Start creating content!
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activities.map((item) => (
                            <div key={`${item.type}-${item.id}`} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                                <div className="mt-1 p-2 bg-muted rounded-full">
                                    {getIcon(item.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <Link
                                            to={item.link}
                                            className="font-medium hover:underline truncate"
                                        >
                                            {item.title}
                                        </Link>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                            {formatDate(item.created_at)}
                                        </span>
                                    </div>
                                    {item.subtitle && (
                                        <p className="text-sm text-muted-foreground truncate">
                                            {item.subtitle}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
