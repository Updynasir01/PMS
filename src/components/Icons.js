/** Small SVG icons for premium UI (no emojis) */

function Svg({ children, size = 16, className = '', strokeWidth = 1.75 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconBuilding({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
      <path d="M15 9v.01M15 12v.01M15 15v.01M15 18v.01" />
    </Svg>
  );
}

export function IconHome({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-7h6v7" />
    </Svg>
  );
}

export function IconBed({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 18V9a2 2 0 0 1 2-2h6v7" />
      <path d="M11 14h8a2 2 0 0 1 2 2v2" />
      <path d="M3 18h18" />
      <path d="M7 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </Svg>
  );
}

export function IconBath({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 12h16v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-2z" />
      <path d="M6 12V6a2 2 0 0 1 2-2h1" />
      <path d="M4 21v-1M20 21v-1" />
    </Svg>
  );
}

export function IconKitchen({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 3h4v10H4z" />
      <path d="M6 13v8" />
      <path d="M12 3v18" />
      <path d="M16 8h4v13h-4z" />
      <path d="M16 8c0-2.5 2-4 2-4s2 1.5 2 4" />
    </Svg>
  );
}

export function IconSofa({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 11a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2H4v-2z" />
      <path d="M4 13v4h16v-4" />
      <path d="M6 17v2M18 17v2" />
      <path d="M8 9V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Svg>
  );
}

export function IconUser({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

export function IconCheck({ size, className }) {
  return (
    <Svg size={size} className={className} strokeWidth={2.25}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

export function IconAlert({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </Svg>
  );
}

export function IconQr({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3M20 14v3h-3M14 20h3M17 17h3" />
    </Svg>
  );
}

export function IconPlus({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconLayers({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 12l10 5 10-5M2 17l10 5 10-5" />
    </Svg>
  );
}

export function IconMapPin({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  );
}

export function IconArrowRight({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </Svg>
  );
}

export function IconStore({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 9 5 3h14l2 6" />
      <path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9" />
      <path d="M10 21V12h4v9" />
    </Svg>
  );
}

export function IconBriefcase({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Svg>
  );
}

export const PROPERTY_TYPE_ICONS = {
  apartment: IconBuilding,
  villa: IconHome,
  commercial: IconStore,
  office: IconBriefcase,
  mixed: IconLayers,
};
