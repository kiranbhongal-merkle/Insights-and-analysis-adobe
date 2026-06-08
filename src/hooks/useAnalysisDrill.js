import { useState, useCallback } from 'react';

/** Shared drill-down state for analysis pages (segment + metric + source dataset). */
export function useAnalysisDrill(sourceId) {
  const [drill, setDrill] = useState(null);

  const openDrill = useCallback((segment, metricKey, sid = sourceId) => {
    setDrill({ segment, metricKey, sourceId: sid });
  }, [sourceId]);

  const closeDrill = useCallback(() => setDrill(null), []);

  return { drill, openDrill, closeDrill, isDimmed: !!drill };
}
