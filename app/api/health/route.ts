import { NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { releaseLabel } from "@/lib/operations";
import { createClient } from "@/lib/supabase/server";

export const dynamic="force-dynamic";
export async function GET(){const started=Date.now(),env=getPublicEnv();if(!env)return NextResponse.json({status:"unhealthy",checks:{configuration:"failed",database:"not_checked"},checkedAt:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}});const supabase=await createClient();if(!supabase)return NextResponse.json({status:"unhealthy",checks:{configuration:"ok",database:"failed"},checkedAt:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}});const{data,error}=await supabase.rpc("health_check");const databaseOk=!error&&data===true,latencyMs=Date.now()-started,status=!databaseOk?"unhealthy":latencyMs>1500?"degraded":"healthy";return NextResponse.json({status,checks:{configuration:"ok",database:databaseOk?"ok":"failed"},latencyMs,release:releaseLabel(process.env.VERCEL_GIT_COMMIT_SHA||process.env.NEXT_PUBLIC_RELEASE_SHA),checkedAt:new Date().toISOString()},{status:databaseOk?200:503,headers:{"Cache-Control":"no-store"}})}
