import { useEffect, useCallback, useRef, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { TaskItem } from "../components/app/TaskItem";
import { useTaskStore } from "../store/taskStore";
import { useWebSocket } from "../hooks/useWebSocket";
import { useToastStore } from "../store/toastStore";
import { useUiInputStore } from "../store/uiInputStore";
import * as api from "../lib/api";
import type { WsMessage } from "../hooks/useWebSocket";

export default function DownloadPage() {
  const { downloadSearch: search, setDownloadSearch: setSearch } = useUiInputStore();
  const [platform, setPlatform] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [batch, setBatch] = useState("");
  const {
    items, loading, error,
    loadTasks, applyProgressUpdate,
    pauseItem, resumeItem, retryItem, retryAllFailed, pauseAll, resumeAll, clearCompleted,
    verifyFiles,
  } = useTaskStore();
  const { addToast } = useToastStore();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleDeleteItem = async (itemId: number) => {
    try {
      await api.deleteTaskItem(itemId);
      await loadTasks();
    } catch (e) {
      addToast("删除失败", "error");
    }
  };

  // 加载任务数据
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // WebSocket 消息处理 —— 仅负责进度/状态更新，通知与音效由全局 useNotificationService 处理
  const onWsMessage = useCallback(
    (msg: WsMessage) => {
      // 逐项进度更新
      if (msg.type === "progress" && msg.updates) {
        for (const update of msg.updates) {
          applyProgressUpdate(update);
        }
      }
    },
    [applyProgressUpdate],
  );

  const { connected } = useWebSocket(onWsMessage);

  // WebSocket 断开时降级为轮询 REST API（每 2 秒）
  useEffect(() => {
    if (connected) {
      // 已连接，清除轮询定时器
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    } else {
      // 未连接，启动轮询（除非已有定时器）
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(() => {
          loadTasks();
        }, 2000);
      }
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [connected, loadTasks]);

  // 过滤
  const filtered = items.filter(
    (t) =>
      (platform === "all" || t.platform === platform) && (statusFilter === "all" || t.status === statusFilter) && (!batch || String(t.taskId) === batch) &&
      (t.title.toLowerCase().includes(search.toLowerCase()) || t.author.toLowerCase().includes(search.toLowerCase())),
  );

  // 统计
  const stats = {
    total: items.length,
    downloading: items.filter((t) => t.status === "downloading").length,
    completed: items.filter((t) => t.status === "completed").length,
    failed: items.filter((t) => t.status === "failed").length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 h-12 border-b border-border-light">
        <Button variant="ghost" size="sm" onClick={pauseAll}>全部暂停</Button>
        <Button variant="ghost" size="sm" onClick={resumeAll}>全部开始</Button>
        <Button variant="ghost" size="sm" className="text-error" onClick={clearCompleted}>清空已完成</Button>
        {stats.failed > 0 && (
          <Button variant="ghost" size="sm" className="text-warning" onClick={retryAllFailed}>
            全部失败重试
          </Button>
        )}
        {stats.completed > 0 && (
          <Button variant="ghost" size="sm" onClick={async () => {
            const result = await verifyFiles();
            if (result.missing_count > 0) {
              addToast(`发现 ${result.missing_count} 个文件缺失，已标记为失败`, "warning");
            } else {
              addToast("所有已完成文件均存在", "success");
            }
          }}>
            校验文件
          </Button>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-xs text-text-secondary mr-2">
            <span>总数 {stats.total}</span>
            {stats.downloading > 0 && <span className="text-purple-500">下载中 {stats.downloading}</span>}
            {stats.completed > 0 && <span className="text-success">已完成 {stats.completed}</span>}
            {stats.failed > 0 && <span className="text-error">失败 {stats.failed}</span>}
          </div>
          <div className="relative w-48">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled" />
            <Input
              placeholder="搜索任务..."
              className="pl-8 h-7 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-6 py-2 border-b border-border-light text-xs">
        <select aria-label="平台" className="glass-surface rounded px-2 py-1" value={platform} onChange={e=>setPlatform(e.target.value)}><option value="all">全部平台</option><option value="douyin">抖音</option><option value="bilibili">B站</option></select>
        <select aria-label="状态" className="glass-surface rounded px-2 py-1" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">全部状态</option>{["pending","downloading","paused","processing","completed","failed"].map(s=><option key={s} value={s}>{({pending:"等待",downloading:"下载中",paused:"暂停",processing:"处理中",completed:"完成",failed:"失败"} as Record<string,string>)[s]}</option>)}</select>
        <select aria-label="批次" className="glass-surface rounded px-2 py-1" value={batch} onChange={e=>setBatch(e.target.value)}><option value="">全部批次</option>{[...new Set(items.map(t=>t.taskId))].map(id=><option key={id} value={id}>批次 {id}</option>)}</select>
        <Button variant="ghost" size="sm" onClick={async()=>{try{const data=await api.exportDownloadHistory();const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="download-history.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{addToast("导出失败","error");}}}>导出历史 JSON</Button>
      </div>
      {/* Error State */}
      {error && (
        <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-sm">
          <div className="flex items-center gap-2 text-sm text-error">
            <span>⚠</span>
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={loadTasks} className="ml-auto">
              重试
            </Button>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-disabled">
            <RefreshCw size={32} className="animate-spin mb-3" />
            <p className="text-sm">正在加载任务列表...</p>
          </div>
        ) : filtered.length === 0 && !error ? (
          search ? (
            <div className="flex flex-col items-center justify-center h-full text-text-disabled">
              <p className="text-base font-medium text-text-primary">没有匹配的任务</p>
              <p className="text-sm mt-1">试试其他关键词</p>
            </div>
          ) : (
            <div />
          )
        ) : (
          <div>
            {filtered.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onPause={pauseItem}
                onResume={resumeItem}
                onRetry={retryItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
