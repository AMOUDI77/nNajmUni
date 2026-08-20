import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { StudyPlanProfile } from '../types';

const STORAGE_KEY = 'najmuni_study_plan_draft';
const emptyProfile: StudyPlanProfile = {
  country: 'SA', program: '', qualification: 'high-school', grade: null,
  english: { type: '' }, budget: '', preferredStart: '', preferences: [],
};

type ContextValue = {
  profile: StudyPlanProfile;
  updateProfile: (patch: Partial<StudyPlanProfile>) => void;
  resetProfile: () => void;
};

const StudyPlanContext = createContext<ContextValue | null>(null);

function loadDraft(): StudyPlanProfile {
  try {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (!draft) return emptyProfile;
    const saved = JSON.parse(draft);
    return { ...emptyProfile, ...saved, qualification: saved.qualification === 'saudi-high-school' ? 'high-school' : saved.qualification };
  } catch { return emptyProfile; }
}

export function StudyPlanProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<StudyPlanProfile>(loadDraft);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); }, [profile]);
  const value = useMemo(() => ({
    profile,
    updateProfile: (patch: Partial<StudyPlanProfile>) => setProfile(current => ({ ...current, ...patch })),
    resetProfile: () => setProfile(emptyProfile),
  }), [profile]);
  return <StudyPlanContext.Provider value={value}>{children}</StudyPlanContext.Provider>;
}

export function useStudyPlan() {
  const value = useContext(StudyPlanContext);
  if (!value) throw new Error('useStudyPlan must be used within StudyPlanProvider');
  return value;
}
