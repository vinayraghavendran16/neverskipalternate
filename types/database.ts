export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type AppRole = "owner" | "administrator" | "principal" | "teacher" | "parent" | "student" | "staff";

type Timestamped = { created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string; avatar_url: string | null } & Timestamped;
        Insert: { id: string; full_name: string; avatar_url?: string | null };
        Update: { full_name?: string; avatar_url?: string | null };
        Relationships: [];
      };
      organizations: {
        Row: { id: string; name: string; slug: string; status: string } & Timestamped;
        Insert: { id?: string; name: string; slug: string; status?: string };
        Update: { name?: string; slug?: string; status?: string };
        Relationships: [];
      };
      campuses: {
        Row: { id: string; organization_id: string; name: string; code: string; timezone: string } & Timestamped;
        Insert: { id?: string; organization_id: string; name: string; code: string; timezone?: string };
        Update: { name?: string; code?: string; timezone?: string };
        Relationships: [];
      };
      academic_years: {
        Row: { id: string; organization_id: string; name: string; starts_on: string; ends_on: string; status: string } & Timestamped;
        Insert: { id?: string; organization_id: string; name: string; starts_on: string; ends_on: string; status?: string };
        Update: { name?: string; starts_on?: string; ends_on?: string; status?: string };
        Relationships: [];
      };
      memberships: {
        Row: { id: string; organization_id: string; campus_id: string | null; user_id: string; role: AppRole; status: string; organizations?: { name: string } | null; campuses?: { name: string } | null } & Timestamped;
        Insert: { id?: string; organization_id: string; campus_id?: string | null; user_id: string; role: AppRole; status?: string };
        Update: { campus_id?: string | null; role?: AppRole; status?: string };
        Relationships: [];
      };
      students: {
        Row: { id: string; organization_id: string; campus_id: string; user_id: string | null; admission_number: string; first_name: string; last_name: string | null; preferred_name: string | null; date_of_birth: string | null; gender: string | null; email: string | null; phone: string | null; address: string | null; emergency_notes: string | null; joined_on: string | null; status: string } & Timestamped;
        Insert: { id?: string; organization_id: string; campus_id: string; user_id?: string | null; admission_number: string; first_name: string; last_name?: string | null; preferred_name?: string | null; date_of_birth?: string | null; gender?: string | null; email?: string | null; phone?: string | null; address?: string | null; emergency_notes?: string | null; joined_on?: string | null; status?: string };
        Update: { user_id?: string | null; campus_id?: string; admission_number?: string; first_name?: string; last_name?: string | null; preferred_name?: string | null; date_of_birth?: string | null; gender?: string | null; email?: string | null; phone?: string | null; address?: string | null; emergency_notes?: string | null; joined_on?: string | null; status?: string };
        Relationships: [];
      };
      staff_profiles: {
        Row: { id: string; organization_id: string; campus_id: string; user_id: string | null; employee_number: string; first_name: string; last_name: string | null; email: string | null; phone: string | null; designation: string; department: string | null; employment_type: string; joined_on: string | null; status: string } & Timestamped;
        Insert: { id?: string; organization_id: string; campus_id: string; user_id?: string | null; employee_number: string; first_name: string; last_name?: string | null; email?: string | null; phone?: string | null; designation: string; department?: string | null; employment_type?: string; joined_on?: string | null; status?: string };
        Update: { campus_id?: string; employee_number?: string; first_name?: string; last_name?: string | null; email?: string | null; phone?: string | null; designation?: string; department?: string | null; employment_type?: string; joined_on?: string | null; status?: string };
        Relationships: [];
      };
      guardians: {
        Row: { id: string; organization_id: string; user_id: string | null; first_name: string; last_name: string | null; email: string | null; phone: string; occupation: string | null; address: string | null; status: string } & Timestamped;
        Insert: { id?: string; organization_id: string; user_id?: string | null; first_name: string; last_name?: string | null; email?: string | null; phone: string; occupation?: string | null; address?: string | null; status?: string };
        Update: { first_name?: string; last_name?: string | null; email?: string | null; phone?: string; occupation?: string | null; address?: string | null; status?: string };
        Relationships: [];
      };
      guardian_relationships: {
        Row: { id: string; organization_id: string; student_id: string; guardian_id: string; guardian_user_id: string | null; relationship: string; is_primary: boolean; can_pick_up: boolean; created_at: string };
        Insert: { id?: string; organization_id: string; student_id: string; guardian_id: string; guardian_user_id?: string | null; relationship: string; is_primary?: boolean; can_pick_up?: boolean };
        Update: { relationship?: string; is_primary?: boolean; can_pick_up?: boolean };
        Relationships: [];
      };
      classes: {
        Row: { id: string; organization_id: string; campus_id: string; academic_year_id: string; grade: string; section: string; homeroom_teacher_user_id: string | null } & Timestamped;
        Insert: { id?: string; organization_id: string; campus_id: string; academic_year_id: string; grade: string; section: string; homeroom_teacher_user_id?: string | null };
        Update: { grade?: string; section?: string; homeroom_teacher_user_id?: string | null };
        Relationships: [];
      };
      class_enrollments: {
        Row: { id: string; organization_id: string; class_id: string; student_id: string; status: string; joined_on: string; left_on: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; class_id: string; student_id: string; status?: string; joined_on?: string; left_on?: string | null };
        Update: { status?: string; joined_on?: string; left_on?: string | null };
        Relationships: [];
      };
      subjects: {
        Row: { id: string; organization_id: string; name: string; code: string; status: string } & Timestamped;
        Insert: { id?: string; organization_id: string; name: string; code: string; status?: string };
        Update: { name?: string; code?: string; status?: string };
        Relationships: [];
      };
      class_subjects: {
        Row: { id: string; organization_id: string; class_id: string; subject_id: string; teacher_staff_id: string | null } & Timestamped;
        Insert: { id?: string; organization_id: string; class_id: string; subject_id: string; teacher_staff_id?: string | null };
        Update: { teacher_staff_id?: string | null };
        Relationships: [];
      };
      timetable_entries: {
        Row: { id: string; organization_id: string; class_id: string; class_subject_id: string; weekday: number; period_number: number; starts_at: string; ends_at: string; room: string | null } & Timestamped;
        Insert: { id?: string; organization_id: string; class_id: string; class_subject_id: string; weekday: number; period_number: number; starts_at: string; ends_at: string; room?: string | null };
        Update: { weekday?: number; period_number?: number; starts_at?: string; ends_at?: string; room?: string | null };
        Relationships: [];
      };
      attendance_sessions: {
        Row: { id: string; organization_id: string; campus_id: string; class_id: string; attendance_date: string; status: string; marked_by: string; submitted_at: string | null } & Timestamped;
        Insert: { id?: string; organization_id: string; campus_id: string; class_id: string; attendance_date: string; status?: string; marked_by: string; submitted_at?: string | null };
        Update: { status?: string; marked_by?: string; submitted_at?: string | null };
        Relationships: [];
      };
      attendance_records: {
        Row: { id: string; organization_id: string; session_id: string; student_id: string; status: string; reason: string | null; marked_at: string };
        Insert: { id?: string; organization_id: string; session_id: string; student_id: string; status: string; reason?: string | null; marked_at?: string };
        Update: { status?: string; reason?: string | null; marked_at?: string };
        Relationships: [];
      };
      attendance_corrections: {
        Row: { id: string; organization_id: string; attendance_record_id: string; requested_by: string; requested_status: string; reason: string; status: string; reviewed_by: string | null; reviewed_at: string | null; created_at: string };
        Insert: { id?: string; organization_id: string; attendance_record_id: string; requested_by: string; requested_status: string; reason: string; status?: string; reviewed_by?: string | null; reviewed_at?: string | null };
        Update: { status?: string; reviewed_by?: string | null; reviewed_at?: string | null };
        Relationships: [];
      };
      lesson_diary_entries: {
        Row: { id: string; organization_id: string; class_subject_id: string; timetable_entry_id: string | null; entry_date: string; topic: string; summary: string; learning_objective: string | null; status: string; created_by: string; published_at: string | null } & Timestamped;
        Insert: { id?: string; organization_id: string; class_subject_id: string; timetable_entry_id?: string | null; entry_date: string; topic: string; summary: string; learning_objective?: string | null; status?: string; created_by: string; published_at?: string | null };
        Update: { topic?: string; summary?: string; learning_objective?: string | null; status?: string; published_at?: string | null };
        Relationships: [];
      };
      homework_assignments: {
        Row: { id: string; organization_id: string; subject_id: string; title: string; instructions: string; due_at: string; estimated_minutes: number | null; status: string; created_by: string; published_at: string | null } & Timestamped;
        Insert: { id?: string; organization_id: string; subject_id: string; title: string; instructions: string; due_at: string; estimated_minutes?: number | null; status?: string; created_by: string; published_at?: string | null };
        Update: { title?: string; instructions?: string; due_at?: string; estimated_minutes?: number | null; status?: string; published_at?: string | null };
        Relationships: [];
      };
      homework_classes: {
        Row: { id: string; organization_id: string; homework_id: string; class_id: string; created_at: string };
        Insert: { id?: string; organization_id: string; homework_id: string; class_id: string };
        Update: { class_id?: string };
        Relationships: [];
      };
      assessments: {
        Row: { id: string; organization_id: string; class_subject_id: string; title: string; assessment_date: string; max_marks: number; weight_percent: number | null; status: string; created_by: string; published_at: string | null } & Timestamped;
        Insert: { id?: string; organization_id: string; class_subject_id: string; title: string; assessment_date: string; max_marks: number; weight_percent?: number | null; status?: string; created_by: string; published_at?: string | null };
        Update: { title?: string; assessment_date?: string; max_marks?: number; weight_percent?: number | null; status?: string; published_at?: string | null };
        Relationships: [];
      };
      assessment_marks: {
        Row: { id: string; organization_id: string; assessment_id: string; student_id: string; marks: number | null; result_status: string; note: string | null; marked_by: string; marked_at: string } & Timestamped;
        Insert: { id?: string; organization_id: string; assessment_id: string; student_id: string; marks?: number | null; result_status?: string; note?: string | null; marked_by: string; marked_at?: string };
        Update: { marks?: number | null; result_status?: string; note?: string | null; marked_by?: string; marked_at?: string };
        Relationships: [];
      };
      audit_events: {
        Row: { id: number; organization_id: string; actor_user_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Json; occurred_at: string };
        Insert: { organization_id: string; actor_user_id?: string | null; action: string; entity_type: string; entity_id?: string | null; metadata?: Json };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      save_attendance_register: { Args: { p_org: string; p_class: string; p_date: string; p_submit: boolean; p_rows: Json }; Returns: string };
      save_marks_register: { Args: { p_assessment: string; p_publish: boolean; p_rows: Json }; Returns: number };
      create_homework_with_classes: { Args: { p_org: string; p_subject: string; p_title: string; p_instructions: string; p_due: string; p_minutes: number | null; p_publish: boolean; p_classes: string[] }; Returns: string };
    };
    Enums: { app_role: AppRole };
    CompositeTypes: Record<string, never>;
  };
};
