import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type AuditInput = {
  organizationId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditEvent(input: AuditInput) {
  const supabase = await createClient();
  if (!supabase) return { error: new Error("Supabase is not configured") };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Authentication required") };

  return supabase.from("audit_events").insert({
    organization_id: input.organizationId,
    actor_user_id: user.id,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    metadata: (input.metadata || {}) as Json,
  });
}
