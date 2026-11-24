import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AppLogo } from "./AppLogo";
import { useThemeStore } from "../../store/themeStore";
export function SplashScreen() {
  const reduced = useReducedMotion();
  const { theme } = useThemeStore();
  const [exit, setExit] = useState(false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const finish = () => setExit(true);
    const timer = window.setTimeout(finish, reduced ? 950 : 2200);
    window.addEventListener("keydown", finish);
    return () => { window.clearTimeout(timer); window.removeEventListener("keydown", finish); };
  }, [reduced]);
  if (gone) return null;
  return <motion.div className={`fixed inset-0 z-[9999] flex cursor-pointer select-none flex-col items-center justify-center overflow-hidden ${theme === "dark" ? "splash-bg-dark" : "splash-bg-light"}`}
    initial={{opacity:0}} animate={{opacity:exit?0:1}} transition={{duration:reduced?0.15:0.35}}
    onAnimationComplete={()=>{if(exit)setGone(true)}} onClick={()=>setExit(true)}>
    <div className="splash-blob splash-blob-a" aria-hidden/><div className="splash-blob splash-blob-b" aria-hidden/>
    <motion.div className="relative flex flex-col items-center" initial={{opacity:0,scale:reduced?1:0.9}} animate={{opacity:1,scale:1}} transition={{duration:reduced?0.1:0.5}}>
      <AppLogo size={128}/><h1 className="mt-5 text-5xl font-semibold tracking-tight text-text-primary">BiliDyDown</h1>
      <p className="mt-4 text-sm tracking-widest text-text-secondary">让视频获取更简单</p>
    </motion.div></motion.div>;
}
