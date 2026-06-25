"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DEFAULT_ORDER = ["mon","tue","wed","thu","fri","sat","sun"];

const WORKOUTS: Record<string, {focus:string,brief:string,metrics:{id:string,label:string,unit:string}[]}> = {
  mon: {
    focus: "Chest & Shoulders",
    brief: "1-mi warm-up mandatory. Bench -> 20 burpee broad jumps -> chest flys -> military press 3x heavy -> wall ball burnout: 50 pro, drop to men's, drop to women's. Sled treadmill 3 min. 1-mi cool-down.",
    metrics: [
      {id:"burpee",label:"Burpee broad jumps",unit:"reps (goal: 20)"},
      {id:"wb-pro",label:"Wall balls - pro weight",unit:"reps"},
      {id:"wb-men",label:"Wall balls - men's weight",unit:"reps"},
      {id:"wb-wom",label:"Wall balls - women's weight",unit:"reps"},
      {id:"mon-mi",label:"Miles run",unit:"mi"},
    ]
  },
  tue: {
    focus: "Run + Arms",
    brief: "400m at goal race pace, 60-sec walk, repeat for 8km. Stop if you miss 2 in a row. Must feel smooth.",
    metrics: [{id:"tue-mi",label:"Miles run",unit:"mi"}]
  },
  wed: { focus: "Off", brief: "Rest day.", metrics: [] },
  thu: {
    focus: "Back & Traps",
    brief: "1-mi warm-up. Deadlift: 2 warm-up + 2 heavy sets. Reverse lunges: 135 lbs, 2x15 each leg. Walking lunges 100m/200 steps. Pulldowns + heavy rows. Toes-to-bar 3x8-10. 1km row. 1-mi cool-down.",
    metrics: [
      {id:"lunges",label:"Walking lunges completed",unit:"steps of 200"},
      {id:"thu-mi",label:"Miles run",unit:"mi"},
    ]
  },
  fri: {
    focus: "Light Run + Striders",
    brief: "Easy 3-5 mi. After: 4-8x 100m striders at 5:30 pace. Walk back between each.",
    metrics: [
      {id:"fri-mi",label:"Miles run",unit:"mi"},
      {id:"striders",label:"Striders completed",unit:"x 100m"},
    ]
  },
  sat: { focus: "Hyrox Class", brief: "Quality effort. Show up and work.", metrics: [] },
  sun: {
    focus: "Long Run",
    brief: "60-90 min aerobic. Easy miles then 2-3 mi at 7:00/mi threshold. If legs cooked: bike OK or run 60 + bike 30.",
    metrics: [
      {id:"sun-mi",label:"Miles run",unit:"mi"},
      {id:"sun-min",label:"Total minutes",unit:"min"},
    ]
  },
};

function weekStart(offset: number) {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  d.setHours(0,0,0,0);
  return d.toISOString().split("T")[0];
}

function weekLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1) + offset * 7);
  const end = new Date(d); end.setDate(d.getDate() + 6);
  const f = (x: Date) => x.toLocaleDateString("en-US",{month:"short",day:"numeric"});
  return f(d) + " - " + f(end);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function loadFromDB(week: string) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/training_weeks?week_start=eq." + week + "&select=data", {
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY }
  });
  const rows = await res.json();
  return rows?.[0]?.data || null;
}

async function saveToDB(week: string, data: unknown) {
  await fetch(SUPABASE_URL + "/rest/v1/training_weeks", {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ week_start: week, data }),
  });
}

export default function Home() {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [order, setOrder] = useState([...DEFAULT_ORDER]);
  const [status, setStatus] = useState<Record<string,string>>({});
  const [metrics, setMetrics] = useState<Record<string,Record<string,string>>>({});
  const [open, setOpen] = useState<string|null>(null);
  const [dragFrom, setDragFrom] = useState<number|null>(null);
  const [dragOver, setDragOver] = useState<number|null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const saveRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const week = weekStart(offset);

  useEffect(() => {
    loadFromDB(week).then(d => {
      if (d) {
        setOrder(d.order || [...DEFAULT_ORDER]);
        setStatus(d.status || {});
        setMetrics(d.metrics || {});
      } else {
        setOrder([...DEFAULT_ORDER]);
        setStatus({});
        setMetrics({});
      }
      setOpen(null);
    });
  }, [week]);

  const save = useCallback((o: string[], s: Record<string,string>, m: Record<string,Record<string,string>>) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    setSaving(true);
    saveRef.current = setTimeout(async () => {
      await saveToDB(week, {order:o,status:s,metrics:m});
      setSaving(false);
    }, 600);
  }, [week]);

  function toggleStatus(id: string, val: string) {
    const next = {...status, [id]: status[id] === val ? "" : val};
    setStatus(next); save(order, next, metrics);
  }

  function setMetric(dayId: string, metricId: string, val: string) {
    const next = {...metrics, [dayId]: {...(metrics[dayId]||{}), [metricId]: val}};
    setMetrics(next); save(order, status, next);
  }

  function getMetric(dayId: string, metricId: string) {
    return metrics[dayId]?.[metricId] || "";
  }

  function drop(toIdx: number) {
    if (dragFrom === null || dragFrom === toIdx) return;
    const next = [...order];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(toIdx, 0, moved);
    setOrder(next); save(next, status, metrics);
    setDragFrom(null); setDragOver(null);
  }

  const totalMiles = [["mon","mon-mi"],["tue","tue-mi"],["thu","thu-mi"],["fri","fri-mi"],["sun","sun-mi"]]
    .reduce((s,[d,m]) => { const v = parseFloat(getMetric(d,m)); return s + (isNaN(v)?0:v); }, 0);

  function signOut() {
    document.cookie = "auth=; path=/; max-age=0";
    router.push("/login");
  }

  async function copyKenny() {
    const text = [
      "Hyrox Log - " + weekLabel(offset),
      "",
      "Mon - burpee broad jumps: " + (getMetric("mon","burpee")||"—") + " reps",
      "Mon - wall balls (pro): " + (getMetric("mon","wb-pro")||"—") + " reps",
      "Mon - wall balls (men's): " + (getMetric("mon","wb-men")||"—") + " reps",
      "Mon - wall balls (women's): " + (getMetric("mon","wb-wom")||"—") + " reps",
      "Thu - walking lunges of 200: " + (getMetric("thu","lunges")||"—") + " steps",
      "Fri - miles run: " + (getMetric("fri","fri-mi")||"—") + " mi",
      "Sun - miles run: " + (getMetric("sun","sun-mi")||"—") + " mi",
      "Sun - total minutes: " + (getMetric("sun","sun-min")||"—") + " min",
      "Weekly total: " + totalMiles.toFixed(1) + " mi",
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setToast("Copied"); setTimeout(()=>setToast(""),2000);
  }

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0a"}}>
      <div style={{position:"sticky",top:0,zIndex:50,borderBottom:"1px solid #1e1e1e",background:"#0a0a0a",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>
        <div>
          <span style={{color:"#e8ff00",fontSize:"11px",fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase"}}>Station 8</span>
          <span style={{color:"#333",fontSize:"11px",marginLeft:"8px",textTransform:"uppercase"}}> / Training Log</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <button onClick={()=>setOffset(o=>o-1)} style={{width:"28px",height:"28px",borderRadius:"6px",border:"1px solid #2a2a2a",background:"none",color:"#555",cursor:"pointer",fontSize:"14px"}}>←</button>
          <span style={{color:"#555",fontSize:"11px",fontFamily:"monospace",minWidth:"160px",textAlign:"center"}}>{weekLabel(offset)}</span>
          <button onClick={()=>setOffset(o=>o+1)} style={{width:"28px",height:"28px",borderRadius:"6px",border:"1px solid #2a2a2a",background:"none",color:"#555",cursor:"pointer",fontSize:"14px"}}>→</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"11px",fontFamily:"monospace",padding:"4px 10px",borderRadius:"20px",border:"1px solid " + (totalMiles>=20?"#e8ff00":"#2a2a2a"),color:totalMiles>=20?"#e8ff00":"#555"}}>
            {totalMiles.toFixed(1)} / 20 mi
          </span>
          {saving && <span style={{fontSize:"10px",color:"#333"}}>saving...</span>}
          <button onClick={signOut} style={{background:"none",border:"none",color:"#333",fontSize:"11px",cursor:"pointer"}}>Sign out</button>
        </div>
      </div>

      <div style={{maxWidth:"700px",margin:"0 auto",padding:"20px 16px 80px"}}>
        <div style={{textAlign:"right",fontSize:"10px",color:"#333",marginBottom:"12px",textTransform:"uppercase"}}>drag to reorder</div>
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {order.map((dayId, idx) => {
            const w = WORKOUTS[dayId];
            if (!w) return null;
            const st = status[dayId];
            const isOpen = open === dayId;
            return (
              <div key={dayId} draggable
                onDragStart={()=>setDragFrom(idx)}
                onDragOver={e=>{e.preventDefault();setDragOver(idx);}}
                onDrop={()=>drop(idx)}
                onDragEnd={()=>{setDragFrom(null);setDragOver(null);}}
                style={{background:"#141414",border:"1px solid " + (dragOver===idx?"#e8ff00":"#1e1e1e"),borderLeft:"3px solid " + (st==="done"?"#22c55e":st==="missed"?"#ef4444":"#1e1e1e"),borderRadius:"10px",opacity:dragFrom===idx?0.3:1}}>
                <div onClick={()=>setOpen(isOpen?null:dayId)}
                  style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px 16px",cursor:"pointer",userSelect:"none"}}>
                  <span style={{color:"#333",cursor:"grab",fontSize:"15px",flexShrink:0}} onClick={e=>e.stopPropagation()}>☰</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"13px",fontWeight:600,color:"white"}}>{DAYS[idx]}</div>
                    <div style={{fontSize:"11px",color:"#c8dc00",marginTop:"2px"}}>{w.focus}</div>
                  </div>
                  <div style={{display:"flex",gap:"6px",flexShrink:0}} onClick={e=>e.stopPropagation()}>
                    {["done","missed"].map(v=>(
                      <button key={v} onClick={()=>toggleStatus(dayId,v)}
                        style={{fontSize:"10px",padding:"3px 10px",borderRadius:"20px",border:"1px solid " + (st===v?(v==="done"?"#22c55e":"#ef4444"):"#2a2a2a"),background:st===v?(v==="done"?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)"):"none",color:st===v?(v==="done"?"#22c55e":"#ef4444"):"#444",cursor:"pointer",textTransform:"uppercase"}}>
                        {v==="done"?"Done":"Missed"}
                      </button>
                    ))}
                  </div>
                  <span style={{color:"#333",fontSize:"11px",display:"inline-block",transform:isOpen?"rotate(180deg)":"none",transition:"transform 0.2s",flexShrink:0}}>▾</span>
                </div>
                {isOpen && (
                  <div style={{padding:"0 16px 16px",borderTop:"1px solid #1e1e1e"}}>
                    <p style={{fontSize:"12px",color:"#888",lineHeight:"1.65",padding:"12px 0",borderBottom:"1px solid #1e1e1e",marginBottom:"14px"}}>{w.brief}</p>
                    {w.metrics.length > 0 ? (
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"8px"}}>
                        {w.metrics.map(m=>(
                          <div key={m.id} style={{background:"#0a0a0a",border:"1px solid #1e1e1e",borderRadius:"8px",padding:"12px"}}>
                            <div style={{fontSize:"9px",color:"#888",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"8px"}}>{m.label}</div>
                            <input type="number" placeholder="0" value={getMetric(dayId,m.id)}
                              onChange={e=>setMetric(dayId,m.id,e.target.value)}
                              style={{width:"100%",background:"none",border:"none",color:"white",fontSize:"20px",fontWeight:700,fontFamily:"monospace",outline:"none",padding:0}} />
                            <div style={{fontSize:"9px",color:"#888",marginTop:"4px"}}>{m.unit}</div>
                          </div>
                        ))}
                      </div>
                    ) : <div style={{fontSize:"11px",color:"#555"}}>No metrics today.</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{marginTop:"32px",border:"1px solid #1e1e1e",borderRadius:"10px",overflow:"hidden"}}>
          <div style={{background:"rgba(232,255,0,0.05)",borderBottom:"1px solid #1e1e1e",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:"10px",color:"#c8dc00",fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase"}}>Report to Kenny</span>
            <button onClick={copyKenny} style={{fontSize:"10px",padding:"4px 10px",borderRadius:"5px",border:"1px solid #c8dc00",background:"none",color:"#c8dc00",cursor:"pointer",textTransform:"uppercase"}}>Copy</button>
          </div>
          {[
            ["Mon - burpee broad jumps", getMetric("mon","burpee"), "reps"],
            ["Mon - wall balls (pro)", getMetric("mon","wb-pro"), "reps"],
            ["Mon - wall balls (men's)", getMetric("mon","wb-men"), "reps"],
            ["Mon - wall balls (women's)", getMetric("mon","wb-wom"), "reps"],
            ["Thu - walking lunges of 200", getMetric("thu","lunges"), "steps"],
            ["Fri - miles run", getMetric("fri","fri-mi"), "mi"],
            ["Sun - miles run", getMetric("sun","sun-mi"), "mi"],
            ["Sun - total minutes", getMetric("sun","sun-min"), "min"],
            ["Weekly total miles", totalMiles>0?totalMiles.toFixed(1):"", "mi"],
          ].map(([k,v,u])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid #1a1a1a"}}>
              <span style={{fontSize:"11px",color:"#888"}}>{k}</span>
              <span style={{fontSize:"12px",fontFamily:"monospace",fontWeight:600,color:v?"white":"#2a2a2a"}}>{v?v+" "+u:"—"}</span>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div style={{position:"fixed",bottom:"24px",left:"50%",transform:"translateX(-50%)",background:"#e8ff00",color:"black",fontSize:"12px",fontWeight:700,padding:"8px 20px",borderRadius:"20px"}}>
          {toast}
        </div>
      )}
    </div>
  );
}
