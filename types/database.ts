export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type AppRole = "owner" | "administrator" | "principal" | "teacher" | "parent" | "student" | "staff";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; full_name: string; avatar_url?: string | null };
        Update: { full_name?: string; avatar_url?: string | null };
        Relationships: [];
      };
      organizations: {
        Row: { id: string; name: string; slug: string; status: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; slug: string; status?: string };
        Update: { name?: string; slug?: string; status?: string };
        Relationships: [];
      };
      campuses: {
        Row: { id: string; organization_id: string; name: string; code: string; timezone: string; created_at: string; updated_at: string };
        Insert: { id?: string; organization_id: string; name: string; code: string; timezone?: string };
        Update: { name?: string; code?: string; timezone?: string };
        Relationships: [];
      };
      memberships: {
        Row: { id: string; organization_id: string; campus_id: string | null; user_id: string; role: AppRole; status: string; created_at: string; updated_at: string; organizations?: { name: string } | null; campuses?: { name: string } | null };
        Insert: { id?: string; organization_id: string; campus_id?: string | null; user_id: string; role: AppRole; status?: string };
        Update: { campus_id?: string | null; role?: AppRole; status?: string };
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
