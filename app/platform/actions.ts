"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isPlatformOwnerEmail } from "@/lib/auth/platform";
import { getPublicEnv } from "@/lib/env";
import { normalizedWebsiteUrl } from "@/lib/platform/portfolio";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { findOrInviteAuthUser } from "@/lib/supabase/users";

const emptyToUndefined = (value: unknown) => String(value || "").trim() || undefined;
const schoolSchema = z.object({
  name:z.string().trim().min(2).max(160), slug:z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  legal_name:z.string().trim().max(200).optional(), website_url:z.string().trim().max(500).optional(), school_type:z.enum(["preschool","day_school","day_boarding","boarding","college","other"]), education_board:z.string().trim().max(80).optional(),
  established_year:z.preprocess(emptyToUndefined,z.coerce.number().int().min(1800).max(2200).optional()), affiliation_number:z.string().trim().max(80).optional(), primary_email:z.preprocess(emptyToUndefined,z.string().email().max(254).optional()), primary_phone:z.string().trim().max(30).optional(),
  plan_name:z.string().trim().min(1).max(80), customer_success_owner:z.string().trim().max(160).optional(), billing_cycle:z.enum(["monthly","quarterly","annual"]), recurring_amount:z.coerce.number().nonnegative(), implementation_fee:z.coerce.number().nonnegative(), contract_status:z.enum(["trial","active","paused","expired"]),
  contract_starts_on:z.string().optional(), contract_ends_on:z.string().optional(), licensed_students:z.preprocess(emptyToUndefined,z.coerce.number().int().nonnegative().optional()),
});
const branchSchema=z.object({name:z.string().trim().min(2).max(160),code:z.string().trim().min(2).max(24),address_line1:z.string().trim().min(3).max(240),city:z.string().trim().min(2).max(100),state:z.string().trim().min(2).max(100),postal_code:z.string().trim().max(20),latitude:z.preprocess(emptyToUndefined,z.coerce.number().min(-90).max(90).optional()),longitude:z.preprocess(emptyToUndefined,z.coerce.number().min(-180).max(180).optional()),email:z.preprocess(emptyToUndefined,z.string().email().max(254).optional()),phone:z.string().trim().max(30)});
const ownerSchema=z.object({name:z.string().trim().min(2).max(160),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),phone:z.string().trim().max(30),job_title:z.string().trim().max(100)});

function status(kind:"success"|"error",message:string):never { redirect(`/platform?${kind}=${encodeURIComponent(message)}`); }
async function platformUser(){const client=await createClient();const {data:{user}}=client?await client.auth.getUser():{data:{user:null}};if(!user||!isPlatformOwnerEmail(user.email))redirect("/login?next=/platform");return user;}
const all=(form:FormData,key:string)=>form.getAll(key).map(String);

export async function createPlatformSchool(formData:FormData){
  const user=await platformUser(), value=(key:string)=>String(formData.get(key)||"").trim();
  const school=schoolSchema.safeParse({name:value("name"),slug:value("slug"),legal_name:value("legal_name"),website_url:value("website_url"),school_type:value("school_type"),education_board:value("education_board"),established_year:value("established_year"),affiliation_number:value("affiliation_number"),primary_email:value("primary_email"),primary_phone:value("primary_phone"),plan_name:value("plan_name"),customer_success_owner:value("customer_success_owner"),billing_cycle:value("billing_cycle"),recurring_amount:value("recurring_amount"),implementation_fee:value("implementation_fee"),contract_status:value("contract_status"),contract_starts_on:value("contract_starts_on"),contract_ends_on:value("contract_ends_on"),licensed_students:value("licensed_students")});
  const names=all(formData,"branch_name"),codes=all(formData,"branch_code"),addresses=all(formData,"branch_address"),cities=all(formData,"branch_city"),states=all(formData,"branch_state"),postals=all(formData,"branch_postal"),lats=all(formData,"branch_latitude"),lngs=all(formData,"branch_longitude"),branchEmails=all(formData,"branch_email"),branchPhones=all(formData,"branch_phone");
  const branches=z.array(branchSchema).min(1).max(50).safeParse(names.map((name,i)=>({name,code:codes[i],address_line1:addresses[i],city:cities[i],state:states[i],postal_code:postals[i],latitude:lats[i],longitude:lngs[i],email:branchEmails[i],phone:branchPhones[i]})));
  const ownerNames=all(formData,"owner_name"),ownerEmails=all(formData,"owner_email"),ownerPhones=all(formData,"owner_phone"),ownerTitles=all(formData,"owner_title");
  const owners=z.array(ownerSchema).min(1).max(20).safeParse(ownerNames.map((name,i)=>({name,email:ownerEmails[i],phone:ownerPhones[i],job_title:ownerTitles[i]})));
  if(!school.success||!branches.success||!owners.success||new Set(branches.success?branches.data.map(b=>b.code.toUpperCase()):[]).size!==names.length||new Set(owners.success?owners.data.map(o=>o.email):[]).size!==ownerNames.length)status("error","Review the school, branch, owner, and commercial details. Branch codes and owner emails must be unique.");
  const website=school.data.website_url?normalizedWebsiteUrl(school.data.website_url):"";if(school.data.website_url&&!website)status("error","Enter a valid school website address.");
  const admin=createAdminClient(),env=getPublicEnv();if(!admin||!env)status("error","Trusted provisioning is not configured.");
  const createdUserIds:string[]=[];let logoPath="",logoUrl="",invitationCount=0;
  try{
    const invited=[];
    for(const [index,entry] of owners.data.entries()){
      const account=await findOrInviteAuthUser(admin,{email:entry.email,fullName:entry.name,redirectTo:`${env.NEXT_PUBLIC_APP_URL}/auth/complete`});
      if(account.created)createdUserIds.push(account.user.id);if(account.invitationSent)invitationCount++;
      invited.push({user_id:account.user.id,job_title:entry.job_title,phone:entry.phone,is_primary:index===0});
    }
    const logo=formData.get("logo");
    if(logo instanceof File&&logo.size){
      if(logo.size>2097152||!["image/png","image/jpeg","image/webp"].includes(logo.type))throw new Error("INVALID_LOGO");
      const extension=logo.type==="image/png"?"png":logo.type==="image/webp"?"webp":"jpg";logoPath=`${school.data.slug}/${crypto.randomUUID()}.${extension}`;
      const upload=await admin.storage.from("brand-assets").upload(logoPath,Buffer.from(await logo.arrayBuffer()),{contentType:logo.type,upsert:false});if(upload.error)throw upload.error;
      logoUrl=admin.storage.from("brand-assets").getPublicUrl(logoPath).data.publicUrl;
    }
    const {error}=await admin.rpc("platform_create_school_portfolio",{p_name:school.data.name,p_slug:school.data.slug.toLowerCase(),p_legal_name:school.data.legal_name||"",p_website_url:website,p_logo_url:logoUrl,p_school_type:school.data.school_type,p_education_board:school.data.education_board||"",p_established_year:school.data.established_year||null,p_affiliation_number:school.data.affiliation_number||"",p_primary_email:school.data.primary_email||"",p_primary_phone:school.data.primary_phone||"",p_customer_success_owner:school.data.customer_success_owner||"",p_branches:branches.data.map(b=>({...b,code:b.code.toUpperCase(),country:"India"})),p_owners:invited,p_plan_name:school.data.plan_name,p_billing_cycle:school.data.billing_cycle,p_recurring_amount:school.data.recurring_amount,p_implementation_fee:school.data.implementation_fee,p_contract_status:school.data.contract_status,p_contract_starts_on:school.data.contract_starts_on||null,p_contract_ends_on:school.data.contract_ends_on||null,p_licensed_students:school.data.licensed_students||null,p_actor_user:user.id});if(error)throw error;
  }catch(error){
    if(logoPath)await admin.storage.from("brand-assets").remove([logoPath]);for(const id of createdUserIds)await admin.auth.admin.deleteUser(id);
    const code=typeof error==="object"&&error!==null&&"code" in error?error.code:"";const message=error instanceof Error&&error.message==="INVALID_LOGO"?"Use a PNG, JPEG, or WebP logo no larger than 2 MB.":code==="23505"?"That school URL, branch code, or owner assignment is already in use.":"The portfolio could not be provisioned. No partial school record was kept.";status("error",message);
  }
  revalidatePath("/platform");status("success",`${school.data.name} is ready with ${branches.data.length} branch${branches.data.length===1?"":"es"}; ${invitationCount} owner invitation${invitationCount===1?" was":"s were"} sent.`);
}

export async function resendOwnerInvitation(formData:FormData){
  await platformUser();const organizationId=String(formData.get("organization_id")||""),userId=String(formData.get("user_id")||"");if(!z.string().uuid().safeParse(organizationId).success||!z.string().uuid().safeParse(userId).success)status("error","Choose a valid school owner.");
  const admin=createAdminClient(),env=getPublicEnv();if(!admin||!env)status("error","Trusted provisioning is not configured.");const {data:membership}=await admin.from("memberships").select("user_id").eq("organization_id",organizationId).eq("user_id",userId).eq("role","owner").eq("status","active").maybeSingle();if(!membership)status("error","That owner does not have active access to this school.");
  const {data,error}=await admin.auth.admin.getUserById(userId);if(error||!data.user?.email)status("error","The owner account could not be loaded.");if(data.user.email_confirmed_at)status("success",`${data.user.email} has already activated their account.`);const result=await admin.auth.admin.inviteUserByEmail(data.user.email,{data:data.user.user_metadata,redirectTo:`${env.NEXT_PUBLIC_APP_URL}/auth/complete`});if(result.error)status("error","A fresh invitation could not be sent. Wait one minute and retry.");status("success",`A fresh owner invitation was sent to ${data.user.email}.`);
}
