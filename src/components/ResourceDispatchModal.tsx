import React, { useState } from 'react';
import { Truck, X, Package, ShieldCheck } from 'lucide-react';
import { LogisticalResource, SupplyDispatchOrder, ResourceLogisticsService } from '../services/resourceLogisticsService';
import { OutbreakCluster } from '../types';

export interface ResourceDispatchModalProps {
  resource: LogisticalResource;
  activeCluster: OutbreakCluster | null;
  onClose: () => void;
  onDispatched: (order: SupplyDispatchOrder) => void;
}

export const ResourceDispatchModal: React.FC<ResourceDispatchModalProps> = ({
  resource,
  activeCluster,
  onClose,
  onDispatched,
}) => {
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    resource.inventory.forEach((i) => {
      init[i.name] = Math.min(20, i.quantity);
    });
    return init;
  });

  const [transport, setTransport] = useState(resource.transport[0]?.vehicleType || 'MOTO_COURIER');

  const distKm = activeCluster
    ? ResourceLogisticsService.calculateDistanceKm(
        resource.latitude,
        resource.longitude,
        activeCluster.centroid_lat,
        activeCluster.centroid_lng
      )
    : 10;

  const { minutes } = ResourceLogisticsService.estimateTransitMinutes(distKm, transport);

  const handleConfirm = () => {
    if (!activeCluster) return;
    const requested = Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([name, qty]) => ({ itemName: name, quantity: qty }));

    const order = ResourceLogisticsService.createDispatchOrder({
      targetClusterId: activeCluster.cluster_id,
      sourceFacilityId: resource.id,
      sourceFacilityName: resource.name,
      itemsRequested: requested,
      transportMode: transport,
      estimatedTransitMinutes: minutes,
    });

    onDispatched(order);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 text-xs text-slate-200 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Emergency Supply Dispatch</h4>
              <p className="text-[11px] text-slate-400">
                Target: Cluster #{activeCluster?.cluster_id ?? 'Unknown'} ({activeCluster?.cluster_label ?? ''})
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Origin Facility:</span>
            <span className="text-white font-bold">{resource.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Distance to Epicenter:</span>
            <span className="text-cyan-400">{distKm} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Estimated Transit ETA:</span>
            <span className="text-emerald-400">~{minutes} minutes</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-mono text-slate-400 block">Allocate Items for Dispatch:</label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {resource.inventory.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800"
              >
                <div>
                  <span className="font-medium text-white block">{item.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Available: {item.quantity} {item.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={selectedItems[item.name] || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setSelectedItems((prev) => ({ ...prev, [item.name]: Math.min(val, item.quantity) }));
                    }}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Confirm & Launch Dispatch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
