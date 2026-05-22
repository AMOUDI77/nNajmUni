export interface University {
  id: number;
  abbr: string;
  name: string;
  type: 'public' | 'private' | 'foreign_branch';
  location: string;
  qs_ranking: number | null;
  color: string;
  description: string;
  website: string;
  domain: string;
  tuition_min: number;
  tuition_max: number;
  established: number;
  students_count: number;
  programs?: Program[];
}

export interface Program {
  id: number;
  university_id: number;
  university_name?: string;
  university_abbr?: string;
  university_location?: string;
  name: string;
  level: 'foundation' | 'diploma' | 'bachelor' | 'master' | 'phd';
  duration_years: number;
  tuition_per_year: number;
  field: string;
  description: string;
  intake: string;
}

export interface Institute {
  id: number;
  abbr: string;
  name: string;
  type: 'language' | 'pathway' | 'training';
  location: string;
  color: string;
  description: string;
  website: string;
  domain: string;
  tuition_min: number;
  tuition_max: number;
  established: number | null;
  students_count: number;
}
