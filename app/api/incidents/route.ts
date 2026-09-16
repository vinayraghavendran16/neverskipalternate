import { createHash } from "node:crypto";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { normalizeErrorDigest,normalizeIncidentRoute } from "@/lib/operations";
import { createClient } from "@/lib/supabase/server";

const payload=z.object({route:z.string().max(500),digest:z.string().max(256).optional()});
export async function POST(request:NextRequest){if(request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({accepted:false},{status:403});if(Number(request.headers.get("content-length")||0)>2048)return NextResponse.json({accepted:false},{status:413});let body:unknown;try{body=await request.json()}catch{return NextResponse.json({accepted:false},{status:400})}const parsed=payload.safeParse(body);if(!parsed.success)return NextResponse.json({accepted:false},{status:400});const supabase=await createClient();if(!supabase)return NextResponse.json({accepted:false},{status:503});const route=normalizeIncidentRoute(parsed.data.route),digest=normalizeErrorDigest(parsed.data.digest),fingerprint=createHash("sha256").update(`${route}|${digest}`).digest("hex");const{error}=await supabase.rpc("report_operational_incident",{p_fingerprint:fingerprint,p_route:route});return NextResponse.json({accepted:!error},{status:error?401:202,headers:{"Cache-Control":"no-store"}})}
