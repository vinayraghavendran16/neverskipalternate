"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { databaseId } from "@/lib/validation";

export type NotificationState = { error?: string; success?: string };

export async function saveNotificationPreferences(_:NotificationState,formData:FormData):Promise<NotificationState>{
  const context=await getUserContext(),supabase=await createClient();
  if(!context||!supabase)return{error:"Sign in again to save notification settings."};
  const enabled=new Set(formData.getAll("channels").map(String));
  const{error}=await supabase.rpc("set_notification_preferences",{p_org:context.organizationId,p_in_app:enabled.has("in_app"),p_email:enabled.has("email"),p_sms:enabled.has("sms")});
  if(error)return{error:"Notification settings could not be saved."};
  revalidatePath("/dashboard/notifications");revalidatePath("/dashboard","layout");
  return{success:"Notification settings saved. Changes apply to new messages."};
}

export async function markNotificationRead(formData:FormData){
  const context=await getUserContext(),supabase=await createClient(),id=String(formData.get("notification_id")||"");
  if(!context||!supabase||!databaseId.safeParse(id).success)return;
  await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id).eq("user_id",context.userId).eq("organization_id",context.organizationId);
  revalidatePath("/dashboard/notifications");revalidatePath("/dashboard","layout");
}

export async function markAllNotificationsRead(){
  const context=await getUserContext(),supabase=await createClient();if(!context||!supabase)return;
  await supabase.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",context.userId).eq("organization_id",context.organizationId).eq("in_app_enabled",true).is("read_at",null);
  revalidatePath("/dashboard/notifications");revalidatePath("/dashboard","layout");
}
