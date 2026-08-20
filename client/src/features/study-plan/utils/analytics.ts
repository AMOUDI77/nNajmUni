export type StudyPlanEvent = 'study_plan_viewed'|'study_plan_started'|'study_plan_step_completed'|'study_plan_completed'|'study_plan_result_viewed'|'study_plan_university_opened'|'study_plan_contact_clicked'|'study_plan_whatsapp_opened'|'study_plan_review_requested';
export function trackStudyPlanEvent(_event: StudyPlanEvent, _context?: object): void {
  // No-op event boundary. Connect to NajmUni analytics when a provider is selected.
}
