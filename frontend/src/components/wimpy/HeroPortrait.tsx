interface HeroPortraitProps {
  id: string;
  size?: number;
}

export function HeroPortrait({ id, size = 220 }: HeroPortraitProps) {
  const common = { width: size, height: size * 1.15, viewBox: "0 0 200 230" };

  if (id === "windman") {
    return (
      <svg {...common}>
        <g fill="none" stroke="#0a0907" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M 30 40 Q 60 30 90 50 Q 50 60 40 80" stroke="#b8d4e8" strokeWidth="3" />
          <path d="M 160 40 Q 130 50 110 30 Q 150 20 170 60" stroke="#b8d4e8" strokeWidth="3" />
          <path d="M 60 95 Q 30 140 50 210 L 80 185 L 100 205 L 120 185 L 150 210 Q 170 140 140 95 Z" fill="#2d7dd2" />
          <path d="M 70 115 L 70 200 L 130 200 L 130 115 Z" fill="#faf3e0" />
          <path d="M 80 130 L 90 160 L 100 140 L 110 160 L 120 130" stroke="#e63946" strokeWidth="5" fill="none" />
          <ellipse cx="100" cy="72" rx="32" ry="36" fill="#f4d8b0" />
          <path d="M 76 44 Q 82 28 92 40 Q 100 26 108 40 Q 116 28 124 46" fill="#1c1a16" />
          <path d="M 72 70 L 96 68 L 96 78 L 72 80 Z M 104 68 L 128 70 L 128 80 L 104 78 Z" fill="#2d7dd2" />
          <circle cx="86" cy="74" r="2" fill="#0a0907" />
          <circle cx="116" cy="74" r="2" fill="#0a0907" />
          <ellipse cx="100" cy="92" rx="5" ry="7" fill="#0a0907" />
          <path d="M 80 200 L 80 225" />
          <path d="M 120 200 L 120 225" />
        </g>
      </svg>
    );
  }

  if (id === "phoboman") {
    return (
      <svg {...common}>
        <g fill="none" stroke="#0a0907" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M 70 28 Q 75 15 70 5" stroke="#b8d4e8" strokeWidth="3" />
          <path d="M 100 22 Q 105 8 100 -2" stroke="#b8d4e8" strokeWidth="3" />
          <path d="M 130 28 Q 135 15 130 5" stroke="#b8d4e8" strokeWidth="3" />
          <path d="M 60 95 Q 35 140 55 210 L 82 185 L 100 205 L 118 185 L 145 210 Q 165 140 140 95 Z" fill="#e63946" />
          <path d="M 70 115 L 70 200 L 130 200 L 130 115 Z" fill="#ffd23f" />
          <ellipse cx="100" cy="155" rx="22" ry="9" fill="#faf3e0" stroke="#0a0907" strokeWidth="3" />
          <path d="M 78 155 Q 100 178 122 155" fill="#e63946" stroke="#0a0907" strokeWidth="3" />
          <path d="M 92 145 Q 100 130 108 145" stroke="#0a0907" strokeWidth="2" fill="none" />
          <ellipse cx="100" cy="72" rx="34" ry="36" fill="#f4c79a" />
          <path d="M 70 50 L 75 30 L 85 48 L 92 28 L 100 48 L 108 28 L 115 48 L 125 30 L 130 50 Z" fill="#1c1a16" />
          <circle cx="89" cy="74" r="2.5" fill="#0a0907" />
          <circle cx="111" cy="74" r="2.5" fill="#0a0907" />
          <path d="M 90 90 Q 100 100 110 90" />
          <path d="M 95 95 Q 100 105 105 95" fill="#e63946" stroke="#0a0907" />
          <path d="M 80 200 L 80 225" />
          <path d="M 120 200 L 120 225" />
        </g>
      </svg>
    );
  }

  if (id === "primm") {
    return (
      <svg {...common}>
        <g fill="none" stroke="#0a0907" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M 30 80 L 36 80 M 33 77 L 33 83" stroke="#8e5ea2" strokeWidth="3" />
          <path d="M 165 60 L 171 60 M 168 57 L 168 63" stroke="#8e5ea2" strokeWidth="3" />
          <path d="M 170 130 L 176 130 M 173 127 L 173 133" stroke="#8e5ea2" strokeWidth="3" />
          <path d="M 50 220 Q 100 218 150 220" stroke="#0a0907" strokeDasharray="4 5" />
          <path d="M 60 100 Q 40 130 55 195 L 80 175 L 100 195 L 120 175 L 145 195 Q 160 130 140 100 Z" fill="#8e5ea2" />
          <path d="M 70 115 L 70 195 L 130 195 L 130 115 Z" fill="#faf3e0" />
          <path d="M 100 130 L 100 175" stroke="#8e5ea2" strokeWidth="6" />
          <circle cx="100" cy="148" r="6" fill="#ffd23f" stroke="#0a0907" strokeWidth="3" />
          <ellipse cx="100" cy="72" rx="32" ry="36" fill="#e8c3a4" />
          <path d="M 68 70 Q 60 110 75 115 L 75 60 Q 100 30 125 60 L 125 115 Q 140 110 132 70" fill="#3a352c" />
          <circle cx="89" cy="76" r="2.5" fill="#0a0907" />
          <circle cx="111" cy="76" r="2.5" fill="#0a0907" />
          <path d="M 92 92 Q 100 96 110 90" />
          <path d="M 80 195 L 80 215" />
          <path d="M 120 195 L 120 215" />
        </g>
      </svg>
    );
  }

  if (id === "tiebe") {
    return (
      <svg {...common}>
        <g fill="none" stroke="#0a0907" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M 25 130 L 25 60 M 20 65 L 25 55 L 30 65" stroke="#0a0907" strokeWidth="2.5" />
          <path d="M 175 130 L 175 200 M 170 195 L 175 205 L 180 195" stroke="#0a0907" strokeWidth="2.5" />
          <path d="M 58 95 Q 32 140 50 210 L 80 185 L 100 205 L 120 185 L 150 210 Q 168 140 142 95 Z" fill="#ffd23f" />
          <path d="M 70 115 L 70 200 L 130 200 L 130 115 Z" fill="#6cbf3f" />
          <path d="M 82 130 L 118 130 L 118 138 L 104 138 L 104 168 L 96 168 L 96 138 L 82 138 Z" fill="#faf3e0" stroke="#0a0907" strokeWidth="3" />
          <ellipse cx="100" cy="72" rx="34" ry="36" fill="#d8a878" />
          <circle cx="74" cy="46" r="10" fill="#1c1a16" />
          <circle cx="90" cy="36" r="10" fill="#1c1a16" />
          <circle cx="108" cy="36" r="11" fill="#1c1a16" />
          <circle cx="124" cy="46" r="10" fill="#1c1a16" />
          <circle cx="86" cy="74" r="2.5" fill="#0a0907" />
          <circle cx="114" cy="74" r="2.5" fill="#0a0907" />
          <path d="M 88 92 Q 100 102 112 92" />
          <rect x="72" y="200" width="20" height="22" fill="#1c1a16" />
          <rect x="108" y="200" width="20" height="22" fill="#1c1a16" />
        </g>
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="20" y="20" width="160" height="190" fill="#fffaee" stroke="#0a0907" strokeWidth="4" />
      <text x="100" y="125" textAnchor="middle" fontFamily="Bangers, Impact, sans-serif" fontSize="36" fill="#1c1a16">
        ?
      </text>
    </svg>
  );
}

export function pickHeroIdByName(name: string | null | undefined): string {
  if (!name) return "windman";
  const n = name.toLowerCase();
  if (n.includes("wind")) return "windman";
  if (n.includes("pho") || n.includes("soup")) return "phoboman";
  if (n.includes("primm") || n.includes("gravity")) return "primm";
  if (n.includes("tiebe") || n.includes("size") || n.includes("giant")) return "tiebe";
  // pseudo-random but stable based on name
  const ids = ["windman", "phoboman", "primm", "tiebe"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return ids[Math.abs(h) % ids.length];
}
