import { useCallback, useEffect, useRef } from 'react';
import type { HandData } from './useGestureControl';
import { getTrainedGestures } from '../api/trainedGestureApi';
import type { LandmarkPoint } from '../api/gestureApi';
import type { TrainedGesture } from '../types';

const MATCH_THRESHOLD = 0.88;
const CONFIRM_FRAMES = 10;
const COOLDOWN_MS = 3000;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function landmarksToVector(lm: LandmarkPoint[]): number[] {
  const vec: number[] = [];
  for (let i = 0; i < 21 && i < lm.length; i++) {
    vec.push(lm[i].x, lm[i].y, lm[i].z);
  }
  return vec;
}

export function useTrainedGestureMatcher(
  userId: string | null,
  onMatch: (slotNumber: number, slotLabel: string, confidence: number) => void
) {
  const trainedRef = useRef<{ slotNumber: number; slotLabel: string; vector: number[] }[]>([]);
  const matchCountRef = useRef(0);
  const currentMatchRef = useRef<number | null>(null);
  const lastFiredRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    if (!userId) return;
    getTrainedGestures(userId).then(slots => {
      trainedRef.current = slots
        .filter((s: TrainedGesture) => s.trained && s.landmarks && s.landmarks.length === 21)
        .map((s: TrainedGesture) => ({
          slotNumber: s.slotNumber,
          slotLabel: s.slotLabel,
          vector: landmarksToVector(s.landmarks!),
        }));
    }).catch(() => {});
  }, [userId]);

  const handleLandmarks = useCallback((hands: HandData[]) => {
    const trained = trainedRef.current;
    if (!trained.length || !hands.length) return;

    const query = landmarksToVector(hands[0].landmarks);
    if (query.length < 63) return;

    const now = Date.now();
    let bestSlot = -1;
    let bestSim = 0;

    for (const t of trained) {
      if (t.vector.length < 63) continue;
      const sim = cosineSimilarity(query, t.vector);
      if (sim > bestSim) {
        bestSim = sim;
        bestSlot = t.slotNumber;
      }
    }

    if (bestSlot < 0 || bestSim < MATCH_THRESHOLD) {
      matchCountRef.current = 0;
      currentMatchRef.current = null;
      return;
    }

    if (currentMatchRef.current !== bestSlot) {
      currentMatchRef.current = bestSlot;
      matchCountRef.current = 1;
      return;
    }

    matchCountRef.current++;

    if (matchCountRef.current >= CONFIRM_FRAMES) {
      const lastFired = lastFiredRef.current.get(bestSlot) || 0;
      if (now - lastFired >= COOLDOWN_MS) {
        lastFiredRef.current.set(bestSlot, now);
        matchCountRef.current = 0;
        currentMatchRef.current = null;
        const matched = trained.find(t => t.slotNumber === bestSlot);
        if (matched) {
          onMatch(matched.slotNumber, matched.slotLabel, bestSim);
        }
      }
    }
  }, [onMatch]);

  return { handleLandmarks };
}
