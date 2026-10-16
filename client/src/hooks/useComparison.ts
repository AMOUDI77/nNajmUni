import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UNIVERSITIES } from '../data';
import { scoreUniversity, type ComparisonScore } from '../services/universityService';
import type { University } from '../types';


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
  const [params, setParams] = useSearchParams();
  const uniA = UNIVERSITIES.find(u => u.id === Number(params.get('university'))) ?? UNIVERSITIES[0];
  const uniB = UNIVERSITIES.find(u => u.id === Number(params.get('with')) && u.id !== uniA.id)
    ?? UNIVERSITIES.find(u => u.id !== uniA.id)!;
  const setUniA = useCallback((id: number) => {
    setParams(current => {
      const next = new URLSearchParams(current);
      next.set('university', String(id));
      if (id === uniB.id) next.set('with', String(uniA.id));
      return next;
    }, { replace: true });
  }, [setParams, uniA.id, uniB.id]);
  const setUniB = useCallback((id: number) => {
    setParams(current => {
      const next = new URLSearchParams(current);
      next.set('with', String(id));
      if (id === uniA.id) next.set('university', String(uniB.id));
      return next;
    }, { replace: true });
  }, [setParams, uniA.id, uniB.id]);

  return {
    uniA,
    uniB,
    scoreA: scoreUniversity(uniA),
    scoreB: scoreUniversity(uniB),
    setUniA,
    setUniB,
    privateUnis: UNIVERSITIES,
  };
}
