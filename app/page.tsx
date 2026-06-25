"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DEFAULT_ORDER = ["mon","tue","wed","thu","fri","sat","sun"];

const WORKOUTS: Record<string, {focus:string,brief:string,metrics:{id:string,label:string,unit:string}[]}> = {
  mon: {
    focus: "Chest & Shoulders",
    brief: "1-mi warm-up mandatory. Bench → 20 burpee broad jumps → chest flys → military press 3× heavy → wall ball burnout: 50 pro, drop to men's, drop to women's. Sled treadmill 3 min. 1-mi cool-down.",
    metrics: [
      {id:"burpee",label:"Burpee broad jumps",unit:"reps (goal: 20)"},
      {id:"wb-pro",label:"Wall balls — pro weight",unit:"reps"},
      {id:"wb-men",label:"Wall balls — men's weight",unit:"reps"},
      {id:"wb-wom",label:"Wall balls — women's weight",unit:"reps"},
      {id:"mon-mi",label:"Miles run",unit:"mi"},
    ]
  },
  tue: {
    focus: "Run + Arms",
    brief: "400m @ goal race pace, 60-sec walk, repeat for 8km. Stop if you miss 2 in a row. Must feel smooth.",
    metrics: [{id:"tue-mi",label:"Miles run",unit:"mi"}]
  },
  wed: { focus: "Off", brief: "Rest day.", metrics: [] },
  thu: {
    focus: "Back & Traps",
    brief: "1-mi warm-up. Deadlift: 2 warm-up + 2 heavy sets. Reverse lunges: 135 lbs, 2×15 each leg. Walking lunges 100m/200 steps. Pulldowns + heavy rows. Toes-to-bar 3×8-10. 1km row. 1-mi cool-down.",
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
  const saveRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const storageKey = "hyrox_" + weekStart(offset);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const d = JSON.parse(saved);
      setOrder(d.order || [...DEFAULT_ORDER]);
      setStatus(d.status || {});
      setMetrics(d.metrics || {});
    } else {
      setOrder([...DEFAULT_ORDER]);
      setStatus({});
      setMetrics({});
    }
    setOpen(null);
  }, [storageKey]);

  const save = useCallback((o: string[], s: Record<string,string>, m: Record<string,Record<string,string>>) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify({order:o,status:s,metrics:m}));
    }, 400);
  }, [storageKey]);

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
    setOrder(next); save(next, status,
