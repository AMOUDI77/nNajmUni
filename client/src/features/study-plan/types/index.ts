export interface StudyPlanProfile {
  country: 'SA';
  qualification: string;
  grade: number | null;
  program: string;
  english: { type: string; score?: number };
  budget: string;
  preferredStart: string;
  preferences: string[];
}

export type VerificationStatus = 'verified' | 'needs-verification' | 'unavailable';
export type EligibilityStatus = 'likely' | 'conditional' | 'review-required' | 'unavailable';
export interface SourceMetadata { sourceName?: string; sourceUrl?: string; verifiedAt?: string; verificationStatus: VerificationStatus }

export interface StudyPlanUniversity {
  universityId: string;
  programId?: string;
  universityName: string;
  universityLogo?: string;
  programName: string;
  academicRoute: string;
  eligibilityStatus: EligibilityStatus;
  annualTuitionMYR?: number;
  intake?: { date?: string; applicationDeadline?: string; timingStatus: VerificationStatus };
  englishRequirement?: string;
  location?: string;
  reasonMatched: string[];
  source: SourceMetadata;
}

export interface StudyPlanResult {
  readiness: { status: 'review-required'; title: string; note: string; breakdown: { label: string; value: string; tone: string; icon: string }[] };
  recommendedIntake: { title: string; date?: string; note: string; status: VerificationStatus };
  studyPaths: { id: string; title: string; description: string; universities: StudyPlanUniversity[] }[];
  budget: { label: string; amountMYR?: number; maxAmountMYR?: number; note: string; status: VerificationStatus }[];
  budgetSummary?: { minMYR: number; maxMYR: number; status: 'within' | 'tight' | 'unknown'; note: string };
  actionPlan: { when: string; action: string; icon: string }[];
}

export interface StudyPlanContactContext { source: string; intent: string; universityId?: string; programId?: string }
