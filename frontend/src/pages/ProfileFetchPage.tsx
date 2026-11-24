import { useState } from "react";
import SubscriptionPanel from "../components/app/SubscriptionPanel";
import BiliFetchPage from "./BiliFetchPage";
import ManualDouyinProfile from "./ManualDouyinProfile";
import { cn } from "../lib/utils";

export default function ProfileFetchPage() {
  const [mode, setMode] = useState<"douyin" | "bilibili" | "subscription">("douyin");
  return <div className="flex flex-col h-full">
    <div className="flex justify-center gap-2 p-2" role="group" aria-label="主页抓取模式">
      {(["douyin", "bilibili", "subscription"] as const).map(value => <button key={value} aria-pressed={mode === value}
        className={cn("glass-surface rounded-lg px-3 py-2 text-xs", mode === value ? "text-purple-500" : "text-text-secondary")}
        onClick={() => setMode(value)}>{value === "douyin" ? "抖音手动抓取" : value === "bilibili" ? "B站手动抓取" : "订阅管理"}</button>)}
    </div>
    <div className="flex-1 min-h-0">{mode === "subscription" ? <SubscriptionPanel/> : mode === "bilibili" ? <BiliFetchPage initialMode="profile"/> : <ManualDouyinProfile/>}</div>
  </div>;
}
