export type Staff = {
  id: number;
  full_name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "COUNSELOR" | "VIEWER";
  status: string;
  avatar_url?: string;
};
export type Label = {
  id: number;
  name: string;
  color: string;
  archived: boolean;
};
export type Conversation = {
  id: number;
  contact_id: number;
  display_name: string;
  username?: string;
  stage: string;
  preview: string;
  last_message_at: string | null;
  unread: boolean;
  assigned_to: number | null;
  assignee_name?: string;
  control: string;
  status: string;
  labels: Label[];
  send_blocked_reason?: string | null;
};
export type Message = {
  id: number;
  text: string;
  direction: string;
  sender_type: string;
  message_type: string;
  status: string;
  safe_error?: string;
  created_at: string;
  provider_timestamp?: string;
  attachments: { type: string; url?: string }[];
};
export type Note = {
  id: number;
  text: string;
  author_name: string;
  created_at: string;
};
export type Memory = {
  id: number;
  field: string;
  value: string;
  confidence: number;
  verified: boolean;
};
export type Contact = {
  id: number;
  display_name: string;
  stage: string;
  lead_id: number | null;
  student_id: number | null;
  country?: string;
  email?: string;
  phone?: string;
  degree_level?: string;
  program_interests?: string;
  university_interests?: string;
  target_intake?: string;
  budget_amount?: number;
  budget_currency?: string;
  english_status?: string;
  preferred_language?: string;
  main_concerns?: string;
  identities?: { id: number; username?: string }[];
  labels?: Label[];
  notes?: Note[];
  memory?: Memory[];
  touchpoints?: {
    id: number;
    event_type: string;
    campaign_name: string;
    occurred_at: string;
  }[];
  conversations?: Conversation[];
};
export type SavedReply = {
  id: number;
  title: string;
  shortcut: string;
  content: string;
  status: "ACTIVE" | "ARCHIVED";
  updated_at?: string;
};
export type Page<T> = {
  items: T[];
  next_cursor?: number | null;
  next_offset?: number | null;
};
