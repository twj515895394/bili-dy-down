import { useState } from "react";
import { HeroSection, HeroActions, HeroTextarea, ParseButton } from "../components/app/Hero";
import { Button } from "../components/ui/button";
import * as api from "../lib/api";
import { useParseStore } from "../store/parseStore";
import { useToastStore } from "../store/toastStore";

export default function ManualDouyinProfile() {
  const [url,setUrl]=useState("");
  const [count,setCount]=useState(50);
  const [selected,setSelected]=useState<Set<number>>(new Set());
  const [downloading,setDownloading]=useState(false);
  const {profileResults:results,profileLoading:loading,profileError:error,fetchHome,clearProfile,removeProfileItems,downloadSelected}=useParseStore();
  const {addToast}=useToastStore();
  const fetch=async()=>{ if(loading||downloading)return; clearProfile();setSelected(new Set());await fetchHome(url.trim(),count); };
  const download=async()=>{setDownloading(true);try{const done=await downloadSelected(results.filter(r=>selected.has(r.index)));removeProfileItems(new Set(done.map(r=>r.index)));setSelected(new Set());addToast("已入队 "+done.length+" 项","success");}catch(e){addToast(e instanceof Error?e.message:"下载失败","error");}finally{setDownloading(false);}};
  return <HeroSection hasResults={results.length>0} loading={loading} hero={<><div className="p-4"><HeroTextarea value={url} onChange={e=>setUrl(e.target.value)} placeholder="粘贴抖音用户主页链接"/></div><HeroActions><select value={count} onChange={e=>setCount(Number(e.target.value))} disabled={loading||downloading} className="glass-surface rounded-lg px-3 py-2">{[20,50,100].map(n=><option key={n} value={n}>最近 {n} 条</option>)}</select><span className="flex-1"/><ParseButton onClick={fetch} disabled={!url.trim()||loading||downloading} loading={loading}/></HeroActions></>}>
    {error&&<div className="p-3 text-error text-sm">{error}</div>}
    <div className="flex flex-col flex-1 min-h-0"><div className="flex items-center gap-2 px-6 py-2"><label className="text-xs"><input type="checkbox" checked={results.length>0&&results.every(r=>selected.has(r.index))} onChange={e=>setSelected(e.target.checked?new Set(results.map(r=>r.index)):new Set())} disabled={downloading}/> 全选</label><span className="text-xs text-text-secondary">共 {results.length} 项</span></div>
    <div className="flex-1 overflow-y-auto">{results.map(r=><label key={r.index} className="flex items-center gap-3 px-6 py-2 border-b border-border-light"><input type="checkbox" checked={selected.has(r.index)} disabled={downloading} onChange={e=>setSelected(prev=>{const next=new Set(prev);e.target.checked?next.add(r.index):next.delete(r.index);return next;})}/>{r.coverUrl&&<img className="w-12 h-12 object-cover rounded" src={api.proxyImageUrl(r.coverUrl)} alt=""/>}<div className="flex-1 min-w-0"><div className="truncate text-sm">{r.title}</div><div className="text-xs text-text-secondary">{r.author} · {r.publishedAt}</div></div></label>)}</div>
    <div className="flex justify-end gap-2 p-3 border-t border-border-light"><Button variant="ghost" disabled={loading||downloading} onClick={()=>{clearProfile();setSelected(new Set());}}>清空</Button><Button disabled={!selected.size||loading||downloading} onClick={download}>开始下载 ({selected.size})</Button></div></div>
  </HeroSection>;
}
