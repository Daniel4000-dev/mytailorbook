import React from 'react';

export type IconRenderer = (props: {
  size: number;
  fill?: boolean;
  strokeWidth?: number;
  color?: string;
}) => React.ReactElement;

export const SVG_ICONS: Record<string, IconRenderer> = {
  // --- CRAFT & TAILORING ICONS ---

  needle: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m20.5 3.5-3 3" />
      <path d="M17.5 6.5 4 20l-1 1 1-1L17.5 6.5Z" fill={fill ? color : 'none'} />
      <circle cx="19" cy="5" r="1" fill={color} />
      <path d="m14 10 3 3" strokeWidth="1.5" />
    </svg>
  ),

  content_cut: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" fill={fill ? color : 'none'} />
      <circle cx="6" cy="18" r="3" fill={fill ? color : 'none'} />
      <path d="M20 4 8.12 15.88" />
      <path d="M14.47 14.48 20 20" />
      <path d="M8.12 8.12 12 12" />
    </svg>
  ),

  thread: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v3H6z" fill={fill ? color : 'none'} />
      <path d="M6 18h12v3H6z" fill={fill ? color : 'none'} />
      <rect x="7" y="6" width="10" height="12" rx="1" fill={fill ? color : 'none'} />
      <path d="M7 9h10M7 12h10M7 15h10" strokeWidth="1.5" />
    </svg>
  ),

  dry_cleaning: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19h16" />
      <path d="M5 19V9a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v10" fill={fill ? color : 'none'} />
      <circle cx="12" cy="11" r="2.5" fill={fill ? '#fff' : 'none'} />
      <path d="M16 19v-4h-3" />
      <path d="M12 5V2" />
    </svg>
  ),

  straighten: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="10" rx="2" fill={fill ? color : 'none'} />
      <path d="M6 7v4M10 7v3M14 7v4M18 7v3" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  assignment_add: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="17" rx="2" fill={fill ? color : 'none'} />
      <path d="M9 2h6v4H9z" fill={fill ? color : 'none'} />
      <path d="M12 11v6M9 14h6" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  assignment: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="17" rx="2" fill={fill ? color : 'none'} />
      <path d="M9 2h6v4H9z" fill={fill ? color : 'none'} />
      <path d="M8 11h8M8 15h5" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  payments: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" fill={fill ? color : 'none'} />
      <circle cx="12" cy="12" r="3" stroke={fill ? '#fff' : color} fill={fill ? '#fff' : 'none'} />
      <path d="M6 9h.01M18 15h.01" />
    </svg>
  ),

  check_circle: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 3 3 6-6" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  check: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),

  task_alt: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 11 3 3L22 4" strokeWidth="2.5" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" fill={fill ? color : 'none'} />
    </svg>
  ),

  spa: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c-4.5 4.5-5 9.5 0 16 5-6.5 4.5-11.5 0-16z" fill={fill ? color : 'none'} />
      <path d="M12 19c-6-1-9-5-9-9 4.5.5 8 3.5 9 9z" fill={fill ? color : 'none'} opacity="0.8" />
      <path d="M12 19c6-1 9-5 9-9-4.5.5-8 3.5-9 9z" fill={fill ? color : 'none'} opacity="0.8" />
    </svg>
  ),

  emoji_events: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4z" fill={fill ? color : 'none'} />
      <path d="M7 6H4a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4h1" />
      <path d="M17 6h3a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-1" />
    </svg>
  ),

  bolt: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),

  leaderboard: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="11" width="6" height="10" rx="1" fill={fill ? color : 'none'} />
      <rect x="9" y="4" width="6" height="17" rx="1" fill={fill ? color : 'none'} />
      <rect x="16" y="8" width="6" height="13" rx="1" fill={fill ? color : 'none'} />
    </svg>
  ),

  checklist: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 6h9M11 12h9M11 18h9" />
      <path d="m3 6 2 2 4-4M3 12 5 14l4-4M3 18l2 2 4-4" />
    </svg>
  ),

  diamond: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 18 3 22 9 12 22 2 9 6 3" />
      <path d="M2 9h20M12 22 8 9M12 22l4-13" />
    </svg>
  ),

  group: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" fill={fill ? color : 'none'} />
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" fill={fill ? color : 'none'} />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  ),

  share: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" fill={fill ? color : 'none'} />
      <circle cx="6" cy="12" r="3" fill={fill ? color : 'none'} />
      <circle cx="18" cy="19" r="3" fill={fill ? color : 'none'} />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),

  chat: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),

  // --- APP SYSTEM ICONS ---

  menu: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),

  close: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),

  arrow_back: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),

  notifications: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill={fill ? color : 'none'} />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),

  cloud_off: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 2 20 20" />
      <path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.954-.446" />
      <path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07" />
    </svg>
  ),

  add: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),

  add_circle: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill={fill ? color : 'none'} />
      <line x1="12" y1="8" x2="12" y2="16" stroke={fill ? '#fff' : color} />
      <line x1="8" y1="12" x2="16" y2="12" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  search: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),

  home: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10L12 3L20 10V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V10Z" fill={fill ? color : 'none'} />
      <path d="M9 21V12H15V21" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  settings: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" fill={fill ? color : 'none'} />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),

  calendar_month: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" fill={fill ? color : 'none'} />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  storefront: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9L4 4H20L21 9V11C21 11.5523 20.5523 12 20 12V20H4V12C3.44772 12 3 11.5523 3 11V9Z" fill={fill ? color : 'none'} />
      <line x1="9" y1="12" x2="9" y2="20" stroke={fill ? '#fff' : color} />
      <line x1="15" y1="12" x2="15" y2="20" stroke={fill ? '#fff' : color} />
      <line x1="3" y1="9" x2="21" y2="9" stroke={fill ? '#fff' : color} />
    </svg>
  ),

  texture: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="7" cy="12" rx="3" ry="8" fill={fill ? color : 'none'} />
      <path d="M7 4H17C18.6569 4 20 5.34315 20 7V17C20 18.6569 18.6569 20 17 20H7" />
      <line x1="13" y1="4" x2="13" y2="20" />
      <line x1="17" y1="4" x2="17" y2="20" />
    </svg>
  ),

  chevron_right: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),

  chevron_left: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),

  expand_more: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),

  expand_less: ({ size, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),

  lock: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill={fill ? color : 'none'} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),

  person: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill={fill ? color : 'none'} />
      <circle cx="12" cy="7" r="4" fill={fill ? color : 'none'} />
    </svg>
  ),

  bar_chart: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" strokeWidth="3" />
      <line x1="18" y1="20" x2="18" y2="4" strokeWidth="3" />
      <line x1="6" y1="20" x2="6" y2="16" strokeWidth="3" />
    </svg>
  ),

  precision_manufacturing: ({ size, fill, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19H20" />
      <path d="M6 19V9C6 6 8 5 11 5H17C18.5 5 19 6.5 19 8V14H15" fill={fill ? color : 'none'} />
      <path d="M15 14V19" />
      <path d="M15 17H13" />
      <circle cx="10" cy="11" r="2" fill={fill ? color : 'none'} />
    </svg>
  ),
};
