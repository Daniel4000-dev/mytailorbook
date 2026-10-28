'use client';

interface GarmentSilhouetteProps {
  type?: 'agbada' | 'senator' | 'suit' | 'gown' | 'boubou' | 'safari' | 'shears' | 'general';
  name?: string;
  size?: number;
  className?: string;
}

/** Resolves style name to the most fitting luxury bespoke silhouette */
export function getSilhouetteType(name: string = ''): 'agbada' | 'senator' | 'suit' | 'gown' | 'boubou' | 'safari' | 'general' {
  const lower = name.toLowerCase();
  if (lower.includes('agbada') || lower.includes('babariga')) return 'agbada';
  if (lower.includes('senator') || lower.includes('kaftan') || lower.includes('native') || lower.includes('danshiki')) return 'senator';
  if (lower.includes('suit') || lower.includes('blazer') || lower.includes('tuxedo') || lower.includes('jacket')) return 'suit';
  if (lower.includes('gown') || lower.includes('dress') || lower.includes('corset') || lower.includes('mermaid')) return 'gown';
  if (lower.includes('boubou') || lower.includes('buba') || lower.includes('iro') || lower.includes('wrapper')) return 'boubou';
  if (lower.includes('safari') || lower.includes('shirt') || lower.includes('linen') || lower.includes('two-piece') || lower.includes('two piece')) return 'safari';
  return 'general';
}

export default function GarmentSilhouette({ type, name, size = 48, className }: GarmentSilhouetteProps) {
  const resolvedType = type || (name ? getSilhouetteType(name) : 'general');

  if (resolvedType === 'shears') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <circle cx="14" cy="38" r="6" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="34" cy="38" r="6" stroke="currentColor" strokeWidth="2.5" />
        <path d="M18 34L32 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 34L16 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="23" r="2.5" fill="currentColor" />
        <path d="M6 14C12 11 18 17 24 14C30 11 36 17 42 14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
      </svg>
    );
  }

  if (resolvedType === 'agbada') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <path
          d="M32 10L10 22V36L20 32V54H44V32L54 36V22L32 10Z"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Embroidered Neck Placket */}
        <path d="M26 14C26 22 38 22 38 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M32 20V34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M29 26H35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M30 30H34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {/* Grand Boubou Pleats */}
        <path d="M20 32C22 42 22 48 20 54" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
        <path d="M44 32C42 42 42 48 44 54" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
      </svg>
    );
  }

  if (resolvedType === 'senator') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Crisp High Collar Tunic */}
        <path
          d="M24 10H40L48 18L44 32L38 30V54H26V30L20 32L16 18L24 10Z"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Mandarin Collar & Slit Placket */}
        <path d="M27 10C27 14 37 14 37 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M32 14V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="18" r="1" fill="currentColor" />
        <circle cx="32" cy="22" r="1" fill="currentColor" />
        <circle cx="32" cy="26" r="1" fill="currentColor" />
        {/* Left Breast Welt Pocket */}
        <path d="M24 24H28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (resolvedType === 'suit') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Tailored Double Breasted Blazer */}
        <path
          d="M22 12L12 24L16 38L20 36V54H44V36L48 38L52 24L42 12H22Z"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Peak Lapels */}
        <path d="M22 12L28 26L32 40L36 26L42 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M28 26L20 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M36 26L44 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {/* Pocket Square */}
        <path d="M24 30H29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M26 28L28 26L29 28" fill="currentColor" fillOpacity="0.6" />
        {/* Double Buttons */}
        <circle cx="30" cy="36" r="1" fill="currentColor" />
        <circle cx="34" cy="36" r="1" fill="currentColor" />
        <circle cx="30" cy="42" r="1" fill="currentColor" />
        <circle cx="34" cy="42" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (resolvedType === 'gown') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Sculpted Corset Mermaid Gown */}
        <path
          d="M24 16C28 14 36 14 40 16L42 24C41 30 36 32 36 36C36 42 46 50 48 54H16C18 50 28 42 28 36C28 32 23 30 22 24L24 16Z"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Sweetheart Neckline */}
        <path d="M24 16C28 19 32 17 32 17C32 17 36 19 40 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        {/* Corset Boning Lines */}
        <path d="M32 17V36" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
        <path d="M28 20V34" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
        <path d="M36 20V34" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" />
        {/* Mermaid Flare Hem */}
        <path d="M20 54C26 51 38 51 44 54" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (resolvedType === 'boubou') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Flowing Silk Boubou */}
        <path
          d="M26 12H38L54 22C46 36 44 46 46 54H18C20 46 18 36 10 22L26 12Z"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* V-Neck & Draped Center Seam */}
        <path d="M26 12L32 22L38 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M32 22V54" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.6" />
      </svg>
    );
  }

  // Safari / Casual / General Bespoke Cut
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 12H40L46 20L42 32L36 30V54H28V30L22 32L18 20L24 12Z"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M28 12L32 18L36 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 18V54" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
      {/* Safari Flap Pockets */}
      <rect x="23" y="24" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
      <rect x="35" y="24" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7" />
    </svg>
  );
}
