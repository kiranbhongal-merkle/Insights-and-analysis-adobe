import { useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Manages nested drill-down path: [{ dimensionId, segmentName }, ...]
 * and the active breakdown dimension at the current level.
 */
export function useDrillPath({ availableDimensions, defaultDimension, resetKey }) {
  const [path, setPath] = useState([]);
  const [dimensionId, setDimensionId] = useState(defaultDimension);

  useEffect(() => {
    setPath([]);
    setDimensionId(defaultDimension);
  }, [resetKey, defaultDimension]);

  const usedDimensionIds = useMemo(
    () => new Set(path.map(p => p.dimensionId)),
    [path],
  );

  const nextDimensions = useMemo(
    () => availableDimensions.filter(id => !usedDimensionIds.has(id)),
    [availableDimensions, usedDimensionIds],
  );

  useEffect(() => {
    if (usedDimensionIds.has(dimensionId) && nextDimensions.length) {
      setDimensionId(nextDimensions[0]);
    }
  }, [usedDimensionIds, dimensionId, nextDimensions]);

  const pushSegment = useCallback((segmentName) => {
    const newPath = [...path, { dimensionId, segmentName }];
    const used = new Set(newPath.map(p => p.dimensionId));
    const nextDim = availableDimensions.find(id => !used.has(id));
    setPath(newPath);
    if (nextDim) setDimensionId(nextDim);
  }, [path, dimensionId, availableDimensions]);

  const truncatePath = useCallback((keepCount) => {
    setPath(prev => prev.slice(0, keepCount));
  }, []);

  const clearPath = useCallback(() => setPath([]), []);

  const canDrillDeeper = nextDimensions.length > 0;

  return {
    path,
    dimensionId,
    setDimensionId,
    nextDimensions,
    pushSegment,
    truncatePath,
    clearPath,
    canDrillDeeper,
  };
}
