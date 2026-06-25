"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === "Sub1") {
      document.cookie = "auth=1; path=/; max-age=2592000";
      router.push("/");
    } else {
      setErr(true);
    }
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{marginBottom:"32px",textAlign:"center"}}>
        <div style={{color:"#e8ff00",fontSize:"11px",fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:"8px"}}>Station 8</div>
        <div style={{fontSize:"24px",fontWeight:700}}>Training Log</div>
      </div>
      <form onSubmit={submit} style={{background:"#141414",border:"1px solid #2a2a2a",borderRadius:"12px",padding:"32px",width:"100%",maxWidth:"320px",display:"flex",flexDirection:"column",gap:"16px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
          <label style={{color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.1em"}}>Password</label>
          <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}} autoFocus
            style={{background:"#1c1c1c",border:"1px solid #2a2a2a",borderRadius:"8px",padding:"12px 16px",color:"white",fontSize:"14px",outline:"none"}} placeholder="••••" />
        </div>
        {err && <div style={{color:"#ef4444",fontSize:"12px",textAlign:"center"}}>Wrong password</div>}
        <button type="submit" style={{background:"#e8ff00",color:"black",fontWeight:700,fontSize:"14px",padding:"12px",borderRadius:"8px",border:"none",cursor:"pointer"}}>Enter</button>
      </form>
    </div>
  );
}
