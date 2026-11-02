"use client";
import { useEffect, useState } from "react";
import type { PublicDirectoryEntry } from "@/types/cctv-directory";

/** One server projection powers both catalogue views. Never uses the 11-camera gate. */
export function useCctvDirectory() {
  const [entries,setEntries]=useState<PublicDirectoryEntry[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    let current=true;
    fetch("/api/cctv-directory",{signal:controller.signal,cache:"no-store"})
      .then(async response=>{
        if(!response.ok)throw new Error("목록 연결을 확인할 수 없습니다.");
        const data=await response.json() as {entries?:PublicDirectoryEntry[]};
        if(!Array.isArray(data.entries))throw new Error("목록 형식을 확인할 수 없습니다.");
        if(current){setEntries(data.entries);setError(null);setLoading(false);}
      }).catch(()=>{if(current){setEntries([]);setError("CCTV 목록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.");setLoading(false);}});
    return()=>{current=false;controller.abort();};
  },[reload]);
  function refresh(){setLoading(true);setError(null);setEntries([]);setReload(n=>n+1);}
  return {entries,loading,error,refresh};
}
