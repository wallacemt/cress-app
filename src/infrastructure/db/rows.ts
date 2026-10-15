export interface UserProfileRow {
  id: number;
  display_name: string;
  instruments: string;
  primary_instrument: string;
  other_instrument_label: string | null;
  experience_level: string | null;
  musical_roles: string;
  ensemble_name: string | null;
  onboarded_at: number;
  updated_at: number;
}
export interface RepertoireItemRow {
  id: string;
  title: string;
  composer: string | null;
  movement: string | null;
  instrument: string | null;
  notes: string | null;
  archived_at: number | null;
  created_at: number;
  updated_at: number;
}
export interface ScoreDocumentRow {
  id: string;
  repertoire_item_id: string;
  label: string;
  relative_path: string;
  sha256: string;
  original_name: string;
  original_path: string | null;
  size_bytes: number;
  sort_order: number;
  last_page: number;
  created_at: number;
}
export interface StudyGoalRow {
  id: string;
  repertoire_item_id: string;
  description: string;
  target_bpm: number | null;
  measure_start: number | null;
  measure_end: number | null;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}
export interface StudySessionRow {
  id: string;
  repertoire_item_id: string;
  goal_id: string | null;
  status: "ACTIVE" | "PAUSED" | "FINISHED";
  started_at: number;
  ended_at: number | null;
  active_ms: number;
  resumed_at: number | null;
  last_heartbeat_at: number;
  initial_bpm: number | null;
  final_bpm: number | null;
  notes: string | null;
}
export interface RecordingRow {
  id: string;
  session_id: string;
  relative_path: string;
  format: string;
  status: "RECORDING" | "COMPLETE";
  duration_ms: number | null;
  sample_rate: number | null;
  bpm: number | null;
  title: string;
  notes: string | null;
  created_at: number;
}
export interface SettingRow {
  key: string;
  value: string;
}
