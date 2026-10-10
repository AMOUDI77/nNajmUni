import type { StudyPlanContactContext, StudyPlanProfile } from '../types';
import { trackStudyPlanEvent } from './analytics';

export function openStudyPlanWhatsApp(_profile: StudyPlanProfile, context: StudyPlanContactContext) {
  trackStudyPlanEvent('study_plan_contact_form_opened', context);
  window.location.assign('https://www.instagram.com/najm.uni/');
}
