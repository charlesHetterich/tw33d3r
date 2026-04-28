interface AvatarProps {
  /** Any hex string (address, profile id, post id). The same seed always produces the same gradient. */
  seed: string;
  size?: number;
  className?: string;
}

export function Avatar({ seed, size = 40, className }: AvatarProps) {
  const { gradient, initials } = avatarFromSeed(seed);
  return (
    <div
      className={`avatar${className ? ` ${className}` : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: gradient,
      }}
      aria-label={seed}
    >
      {initials}
    </div>
  );
}

function avatarFromSeed(seed: string): { gradient: string; initials: string } {
  const clean = seed.replace(/^0x/i, "");
  // Two hues from the first bytes → distinct gradient per seed.
  const h1 = (parseInt(clean.slice(0, 4) || "0", 16) % 360 + 360) % 360;
  const h2 = (parseInt(clean.slice(4, 8) || "0", 16) % 360 + 360) % 360;
  const gradient = `linear-gradient(135deg, hsl(${h1} 70% 55%), hsl(${h2} 70% 40%))`;
  const initials = clean.slice(0, 2).toUpperCase();
  return { gradient, initials };
}
