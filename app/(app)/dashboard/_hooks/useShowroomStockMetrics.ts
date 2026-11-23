import { useEffect, useState } from 'react';
import { getStockAction } from '@/app/actions/stock';

export interface ShowroomStockMetrics {
  totalPieces: number;
  lowStockCount: number;
  outOfStockCount: number;
  uniqueStylesCount: number;
  retailValuation: number;
  loading: boolean;
}

export function useShowroomStockMetrics(shopId: string | undefined, enabled = true): ShowroomStockMetrics {
  const [metrics, setMetrics] = useState<ShowroomStockMetrics>({
    totalPieces: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    uniqueStylesCount: 0,
    retailValuation: 0,
    loading: enabled && !!shopId,
  });

  useEffect(() => {
    if (!enabled || !shopId) {
      setMetrics((prev) => ({ ...prev, loading: false }));
      return;
    }

    let isMounted = true;

    async function load() {
      try {
        const res = await getStockAction(shopId!);
        if (!isMounted) return;

        if (Array.isArray(res)) {
          let totalPieces = 0;
          let lowStockCount = 0;
          let outOfStockCount = 0;
          let retailValuation = 0;
          const stylesSet = new Set<string>();

          for (const item of res) {
            const q = Number(item.quantity) || 0;
            const p = Number(item.price) || 0;
            totalPieces += q;
            retailValuation += p * q;
            if (item.name) {
              stylesSet.add(item.name.toLowerCase().trim());
            }

            if (q === 0) {
              outOfStockCount++;
            } else if (q <= 2) {
              lowStockCount++;
            }
          }

          setMetrics({
            totalPieces,
            lowStockCount,
            outOfStockCount,
            uniqueStylesCount: stylesSet.size,
            retailValuation,
            loading: false,
          });
        } else {
          setMetrics((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        if (isMounted) {
          setMetrics((prev) => ({ ...prev, loading: false }));
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [shopId, enabled]);

  return metrics;
}
