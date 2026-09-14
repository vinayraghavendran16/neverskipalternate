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
      audit_events: {
        Row: { id: number; organization_id: string; actor_user_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Json; occurred_at: string };
        Insert: { organization_id: string; actor_user_id?: string | null; action: string; entity_type: string; entity_id?: string | null; metadata?: Json };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { app_role: AppRole };
    CompositeTypes: Record<string, never>;
  };
};
