export type TailorTier = {
  name: string;
  icon: string;
  minXp: number;
  color: string;
};

export const TAILOR_TIERS: TailorTier[] = [
  { name: 'Bronze Needle', icon: 'needle', minXp: 0, color: '#CD7F32' },
  { name: 'Silver Scissors', icon: 'content_cut', minXp: 500, color: '#C0C0C0' },
  { name: 'Gold Spool', icon: 'thread', minXp: 2000, color: '#FFD700' },
  { name: 'Diamond Machine', icon: 'dry_cleaning', minXp: 5000, color: '#b9f2ff' }, // using dry_cleaning as a machine placeholder, or maybe something else
];

export function getTierForXp(xp: number): TailorTier {
  // Find highest tier where xp >= minXp
  for (let i = TAILOR_TIERS.length - 1; i >= 0; i--) {
    if (xp >= TAILOR_TIERS[i].minXp) {
      return TAILOR_TIERS[i];
    }
  }
  return TAILOR_TIERS[0];
}

export function getNextTierProgress(xp: number) {
  const currentTierIndex = TAILOR_TIERS.findIndex(t => t.name === getTierForXp(xp).name);
  if (currentTierIndex === TAILOR_TIERS.length - 1) {
    return { nextTier: null, progress: 100, xpNeeded: 0 };
  }
  
  const currentTier = TAILOR_TIERS[currentTierIndex];
  const nextTier = TAILOR_TIERS[currentTierIndex + 1];
  
  const xpInTier = xp - currentTier.minXp;
  const tierRange = nextTier.minXp - currentTier.minXp;
  const progress = Math.min(100, Math.max(0, (xpInTier / tierRange) * 100));
  const xpNeeded = nextTier.minXp - xp;
  
  return { nextTier, progress, xpNeeded };
}
