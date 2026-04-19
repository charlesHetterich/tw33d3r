import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { filled?: boolean };

const baseProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={28} height={28} viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M6 6h20l-7 8 7 12H18l-5-8-7 8V6z" />
    </svg>
  );
}

export function HomeIcon({ filled, ...props }: IconProps) {
  if (filled) {
    return (
      <svg {...baseProps} fill="currentColor" stroke="none" {...props}>
        <path d="M3 11.5L12 3l9 8.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9.5z" />
      </svg>
    );
  }
  return (
    <svg {...baseProps} {...props}>
      <path d="M3 11.5L12 3l9 8.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  );
}

export function UserIcon({ filled, ...props }: IconProps) {
  if (filled) {
    return (
      <svg {...baseProps} fill="currentColor" stroke="none" {...props}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8H4z" />
      </svg>
    );
  }
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function PostIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 20l3-8 13-13 5 5-13 13-8 3z" />
      <path d="M15 5l4 4" />
    </svg>
  );
}

export function ReplyIcon(props: IconProps) {
  return (
    <svg {...baseProps} width={18} height={18} {...props}>
      <path d="M21 12c0 4.4-4 8-9 8-1.6 0-3-.3-4.3-.9L3 20l1.4-4.2C3.5 14.5 3 13.3 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
    </svg>
  );
}

export function RepostIcon(props: IconProps) {
  return (
    <svg {...baseProps} width={18} height={18} {...props}>
      <path d="M4 7h14l-3-3M20 17H6l3 3" />
    </svg>
  );
}

export function LikeIcon({ filled, ...props }: IconProps) {
  if (filled) {
    return (
      <svg {...baseProps} width={18} height={18} fill="currentColor" stroke="none" {...props}>
        <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z" />
      </svg>
    );
  }
  return (
    <svg {...baseProps} width={18} height={18} {...props}>
      <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg {...baseProps} width={18} height={18} {...props}>
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg {...baseProps} fill="currentColor" stroke="none" width={18} height={18} {...props}>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}
