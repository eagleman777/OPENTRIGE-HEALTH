import { useState, useEffect } from 'react';

export interface BatteryStatus {
  level: number;
  isCharging: boolean;
}

export function useBatteryStatus(): BatteryStatus {
  const [status, setStatus] = useState<BatteryStatus>({
    level: 78,
    isCharging: false,
  });

  useEffect(() => {
    // Check if navigator.getBattery exists
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          setStatus({
            level: Math.round(battery.level * 100),
            isCharging: battery.charging,
          });
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => {
        // Fallback to simulated battery
      });
    }
  }, []);

  return status;
}
