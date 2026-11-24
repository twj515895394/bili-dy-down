export function AppLogo({ size = 26, className }: { size?: number; className?: string }) {
  return <img src="/bili-dy-down.png" width={size} height={size} className={className} alt="BiliDyDown" draggable={false} />;
}
