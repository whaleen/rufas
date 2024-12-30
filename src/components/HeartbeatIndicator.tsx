import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileSystemStore } from '../store/fileSystemStore';

export const HeartbeatIndicator = () => {
  const [isActive, setIsActive] = useState(false);
  const isPolling = useFileSystemStore(state => state.isPolling);

  useEffect(() => {
    if (!isPolling) return;

    // Initial pulse
    setIsActive(true);
    const timeout = setTimeout(() => setIsActive(false), 500);

    // Set up interval for continuous pulses
    const interval = setInterval(() => {
      setIsActive(true);
      setTimeout(() => setIsActive(false), 500);
    }, 5000); // Matches polling interval

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isPolling]);

  if (!isPolling) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Activity
        className={cn(
          "w-3 h-3 transition-all duration-500",
          isActive && "text-green-500 scale-125"
        )}
      />
      <span>Poll</span>
    </div>
  );
};

export default HeartbeatIndicator;
