"use server";
import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { databaseId } from "@/lib/validation";

export async function reviewIncident(formData:FormData){const context=await getUserContext(),supabase=await createClient();if(!context||!supabase||!["owner","administrator"].includes(context.role))return;const id=String(formData.get("incident_id")||""),decision=String(formData.get("decision")||"");if(!databaseId.safeParse(id).success||!["acknowledged","resolved"].includes(decision))return;await supabase.from("operational_incidents").update(decision==="resolved"?{status:decision,resolved_by:context.userId,resolved_at:new Date().toISOString()}:{status:decision,acknowledged_by:context.userId,acknowledged_at:new Date().toISOString()}).eq("id",id).eq("organization_id",context.organizationId);revalidatePath("/dashboard/operations")}

export async function pruneIncidents(){const context=await getUserContext(),supabase=await createClient();if(!context||!supabase||!["owner","administrator"].includes(context.role))return;const cutoff=new Date(Date.now()-90*86400000).toISOString();await supabase.from("operational_incidents").delete().eq("organization_id",context.organizationId).eq("status","resolved").lt("last_seen_at",cutoff);revalidatePath("/dashboard/operations")}
