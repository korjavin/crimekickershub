import type { PublicStoryItem } from '@/lib/api-types';

interface ComicReaderProps {
  items: PublicStoryItem[];
}

// Generate consistent but varied layout for each panel based on index
const getPanelStyle = (index: number) => {
  // Use index to create deterministic but varied patterns
  const seed = index;

  // Rotation: subtle tilt alternating directions
  const rotationPattern = [0, -1, 1, -0.5, 0.5, 0, -1.5, 1.5];
  const rotation = rotationPattern[seed % rotationPattern.length];

  // Horizontal shift: alternate left/right alignment
  const shiftPattern = ['0%', '-3%', '3%', '-5%', '5%', '0%', '-2%', '2%'];
  const translateX = shiftPattern[seed % shiftPattern.length];

  // Scale: slight size variation for depth
  const scalePattern = [1, 0.98, 1.02, 0.99, 1.01, 1, 0.97, 1.03];
  const scale = scalePattern[seed % scalePattern.length];

  // Margin: varied spacing between panels
  const marginPattern = ['3rem', '4rem', '2.5rem', '5rem', '3.5rem', '2rem', '4.5rem', '3rem'];
  const marginBottom = marginPattern[seed % marginPattern.length];

  return {
    transform: `translateX(${translateX}) rotate(${rotation}deg) scale(${scale})`,
    marginBottom,
  };
};

export const ComicReader = ({ items }: ComicReaderProps) => {
  return (
    <div className="w-full max-w-[700px] mx-auto bg-gray-900 min-h-screen py-8 px-4">
      {items.map((item, index) => {
        const panelStyle = getPanelStyle(index);

        return (
          <div
            key={index}
            className="relative transition-transform duration-300 hover:scale-[1.02] hover:rotate-0"
            style={panelStyle}
          >
            {/* Comic panel border and shadow */}
            <div className="relative rounded-lg overflow-hidden shadow-2xl border-4 border-white/10 bg-black">
              {/* Inner glow effect */}
              <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none z-10" />

              {item.type === 'image' && item.url && (
                <img
                  src={item.url}
                  alt={`Panel ${index + 1}`}
                  className="w-full block"
                  loading="lazy"
                />
              )}
              {item.type === 'video' && item.youtube_id && (
                <div className="w-full relative" style={{ paddingTop: '56.25%' }}>
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
              {item.type === 'text' && (
                <div className="w-full bg-white text-black p-8 min-h-[300px] flex flex-col justify-center items-center text-center">
                  {/* Fallback simple rendering since we don't have a markdown library installed yet */}
                  <div className="prose prose-lg max-w-none">
                    <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed">
                      {item.text_content}
                    </div>
                  </div>
                </div>
              )}

              {/* Panel number badge */}
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-mono px-2 py-1 rounded backdrop-blur-sm">
                #{index + 1}
              </div>
            </div>
          </div>
        );
      })}

      {/* End of story marker */}
      <div className="text-center mt-12 mb-8 text-gray-500 font-serif text-lg">
        — End —
      </div>
    </div>
  );
};
