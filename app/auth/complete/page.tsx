import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompleteAccountForm } from "./complete-form";
export default async function CompleteAccountPage(){const supabase=await createClient();const {data:{user}}=supabase?await supabase.auth.getUser():{data:{user:null}};if(!user)redirect("/login");return <main className="login-page"><section className="login-card"><div className="brand login-brand"><span className="brand-mark"><i/><i/><i/></span><span>Northstar</span></div><span className="eyebrow">INVITATION ACCEPTED</span><h1>Complete your account.</h1><p>Set your name and password. You will use the same login page every time.</p><CompleteAccountForm defaultName={String(user.user_metadata?.full_name||"")}/></section></main>}
