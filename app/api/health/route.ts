import { NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { releaseLabel } from "@/lib/operations";
import { createClient } from "@/lib/supabase/server";

export const dynamic="force-dynamic";
export async function GET(){const started=Date.now(),env=getPublicEnv();if(!env)return NextResponse.json({status:"unhealthy",checks:{configuration:"failed",database:"not_checked"},checkedAt:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}});const supabase=await createClient();if(!supabase)return NextResponse.json({status:"unhealthy",checks:{configuration:"ok",database:"failed"},checkedAt:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}});const{error}=await supabase.from("organizations").select("id",{head:true,count:"exact"}).limit(1);const latencyMs=Date.now()-started,status=error?"unhealthy":latencyMs>1500?"degraded":"healthy";return NextResponse.json({status,checks:{configuration:"ok",database:error?"failed":"ok"},latencyMs,release:releaseLabel(process.env.VERCEL_GIT_COMMIT_SHA||process.env.NEXT_PUBLIC_RELEASE_SHA),checkedAt:new Date().toISOString()},{status:error?503:200,headers:{"Cache-Control":"no-store"}})}
