import type { PublicStoryItem } from '@/lib/api-types';

interface ComicReaderProps {
  items: PublicStoryItem[];
}

export const ComicReader = ({ items }: ComicReaderProps) => {
  return (
    <div className="w-full max-w-[600px] mx-auto bg-black min-h-screen">
      {items.map((item, index) => (
        <div key={index} className="w-full" style={{ lineHeight: 0 }}>
          {item.type === 'image' && item.url && (
            <img
              src={item.url}
              alt={`Panel ${index + 1}`}
              className="w-full block"
              loading="lazy"
              style={{ marginBottom: 0, display: 'block' }}
            />
          )}
          {item.type === 'video' && item.youtube_id && (
            <div className="w-full relative" style={{ paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${item.youtube_id}?mute=1`}
                title={`Video Panel ${index + 1}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
