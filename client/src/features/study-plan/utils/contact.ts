import type { StudyPlanContactContext, StudyPlanProfile } from '../types';
import { trackStudyPlanEvent } from './analytics';
import { applicationUrl } from '../../../discovery';
import { UNIVERSITIES, PROGRAMS } from '../../../data';

export function openStudyPlanWhatsApp(_profile: StudyPlanProfile, context: StudyPlanContactContext) {
  trackStudyPlanEvent('study_plan_contact_form_opened', context);
  const university = UNIVERSITIES.find(u => String(u.id) === context.universityId);
  const program = PROGRAMS.find(p => String(p.id) === context.programId);
  window.location.assign(applicationUrl({ university: university?.name, program: program?.name, level: program?.level }, true));
}
