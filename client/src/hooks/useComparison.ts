import { useState, useCallback } from 'react';
import { UNIVERSITIES } from '../data';
import { scoreUniversity, type ComparisonScore } from '../services/universityService';
import type { University } from '../types';

const PRIVATE_UNIS = UNIVERSITIES.filter(u => u.type !== 'public');

export interface ComparisonState {
  uniA: University;
  uniB: University;
  scoreA: ComparisonScore;
  scoreB: ComparisonScore;
  setUniA: (id: number) => void;
  setUniB: (id: number) => void;
  privateUnis: University[];
}

export function useComparison(): ComparisonState {
  const [aId, setAId] = useState(PRIVATE_UNIS[0]?.id ?? 0);
  const [bId, setBId] = useState(PRIVATE_UNIS[2]?.id ?? 0);

  const uniA = UNIVERSITIES.find(u => u.id === aId) ?? PRIVATE_UNIS[0];
  const uniB = UNIVERSITIES.find(u => u.id === bId) ?? PRIVATE_UNIS[2];

  const setUniA = useCallback((id: number) => setAId(id), []);
  const setUniB = useCallback((id: number) => setBId(id), []);

  return {
    uniA,
    uniB,
    scoreA: scoreUniversity(uniA),
    scoreB: scoreUniversity(uniB),
    setUniA,
    setUniB,
    privateUnis: PRIVATE_UNIS,
  };
}
