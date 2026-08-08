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

export function IconZap({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />
    </Svg>
  );
}

export function IconWrench({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Svg>
  );
}

export function IconPaint({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M19 3H9a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
      <path d="M7 7v12a2 2 0 0 0 2 2h2" />
      <path d="M11 21a2 2 0 0 0 2-2v-3h5a2 2 0 0 0 2-2V7" />
    </Svg>
  );
}

export function IconSnowflake({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 2v20M2 12h20" />
      <path d="m4.9 4.9 14.2 14.2M19.1 4.9 4.9 19.1" />
      <path d="m8 4 4 4 4-4M8 20l4-4 4 4M4 8l4 4-4 4M20 8l-4 4 4 4" />
    </Svg>
  );
}

export function IconNut({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 2 4.5 6.5v11L12 22l7.5-4.5v-11L12 2z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function IconMessage({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

export function IconWallet({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M16 14h.01" />
    </Svg>
  );
}

export function IconChart({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 17V10M12 17V7M16 17v-4" />
    </Svg>
  );
}

export function IconClock({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function IconWorker({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <path d="M8 11h8" />
    </Svg>
  );
}

export function IconHammer({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" />
      <path d="M17.64 15 22 10.64" />
      <path d="m20.91 11.7-1.25-1.25c-.6-.6-.9-1.4-.9-2.25v-.91L16.01 4.6c-.62-.62-1.63-.62-2.25 0L11 7.36" />
    </Svg>
  );
}

export function IconCreditCard({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </Svg>
  );
}

export function IconStar({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 21l1.1-6.5L2.6 9.8l6.5-.9L12 3z" />
    </Svg>
  );
}

export function IconClipboard({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <rect x="6" y="4" width="12" height="18" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M9 12h6M9 16h4" />
    </Svg>
  );
}

export function IconInfo({ size, className }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </Svg>
  );
}

export function IconX({ size, className }) {
  return (
    <Svg size={size} className={className} strokeWidth={2}>
      <path d="M18 6 6 18M6 6l12 12" />
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

export const MR_TYPE_ICONS = {
  electricity: IconZap,
  plumbing: IconWrench,
  painting: IconPaint,
  ac_cooling: IconSnowflake,
  other: IconNut,
};

/** Premium maintenance type icon */
export function MrTypeIcon({ type, size = 18, className = '' }) {
  const Icon = MR_TYPE_ICONS[type] || IconWrench;
  return <Icon size={size} className={className} />;
}
