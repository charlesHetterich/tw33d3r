interface AvatarProps {
  address: string;
  size?: number;
  className?: string;
}

export function Avatar({ address, size = 40, className }: AvatarProps) {
  const { gradient, initials } = avatarFromAddress(address);
  return (
    <div
      className={`avatar${className ? ` ${className}` : ""}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: gradient,
      }}
      aria-label={address}
    >
      {initials}
    </div>
  );
}

function avatarFromAddress(address: string): { gradient: string; initials: string } {
  const clean = address.replace(/^0x/i, "");
  // Derive two hues from address bytes for a distinct gradient
  const h1 = (parseInt(clean.slice(0, 4) || "0", 16) % 360 + 360) % 360;
  const h2 = (parseInt(clean.slice(4, 8) || "0", 16) % 360 + 360) % 360;
  const gradient = `linear-gradient(135deg, hsl(${h1} 70% 55%), hsl(${h2} 70% 40%))`;
  const initials = clean.slice(0, 2).toUpperCase();
  return { gradient, initials };
}
