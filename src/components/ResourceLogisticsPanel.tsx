import React, { useState } from 'react';
import { Package, Truck, Snowflake, Navigation, Radio, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LogisticalResource, SupplyDispatchOrder } from '../services/resourceLogisticsService';
import { OutbreakCluster, NetworkCondition } from '../types';

export interface ResourceLogisticsPanelProps {
  resources: LogisticalResource[];
  dispatchOrders: SupplyDispatchOrder[];
  activeCluster: OutbreakCluster | null;
  selectedResourceId?: string | null;
  onSelectResource?: (id: string | null) => void;
  onRequestDispatch?: (res: LogisticalResource) => void;
  networkCondition: NetworkCondition;
  initialTab?: 'FACILITIES' | 'DISPATCHES' | 'LOGISTICS_REQUEST';
}

export const ResourceLogisticsPanel: React.FC<ResourceLogisticsPanelProps> = ({
  resources,
  dispatchOrders,
  activeCluster,
  selectedResourceId,
  onSelectResource,
  onRequestDispatch,
  networkCondition,
  initialTab = 'FACILITIES',
}) => {
  const [tab, setTab] = useState<'FACILITIES' | 'DISPATCHES' | 'LOGISTICS_REQUEST'>(initialTab);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-4">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-white">Logistics & Supply Telemetry</h4>
            <p className="text-[11px] text-slate-400">Cold Chain Storage, Depots, and Emergency Dispatches</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('FACILITIES')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              tab === 'FACILITIES' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Facilities ({resources.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('DISPATCHES')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              tab === 'DISPATCHES' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Dispatches ({dispatchOrders.length})
          </button>
        </div>
      </div>

      {tab === 'FACILITIES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {resources.map((res) => {
            const isSelected = selectedResourceId === res.id;
            return (
              <div
                key={res.id}
                onClick={() => onSelectResource && onSelectResource(res.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-semibold text-white text-[12px]">{res.name}</h5>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {res.type.replace('_', ' ')} • Transport: {res.transport.map((t) => t.vehicleType.replace('_', ' ')).join(', ')}
                    </span>
                  </div>
                  {res.temperatureCelsius !== undefined && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      <Snowflake className="h-2.5 w-2.5" />
                      {res.temperatureCelsius}°C
                    </span>
                  )}
                </div>

                <div className="mt-2.5 space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono block">Cached Inventory:</span>
                  <div className="flex flex-wrap gap-1">
                    {res.inventory.slice(0, 3).map((item, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 bg-slate-900 text-slate-300 rounded text-[9px] border border-slate-800"
                      >
                        {item.quantity} {item.unit} {item.name}
                      </span>
                    ))}
                  </div>
                </div>

                {onRequestDispatch && activeCluster && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestDispatch(res);
                    }}
                    className="mt-3 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Truck className="h-3 w-3" />
                    <span>Dispatch to Cluster #{activeCluster.cluster_id}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'DISPATCHES' && (
        <div className="space-y-2">
          {dispatchOrders.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No active supply dispatches currently in transit.</p>
          ) : (
            dispatchOrders.map((order) => (
              <div
                key={order.orderId}
                className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400">{order.orderId}</span>
                    <span className="text-slate-400">→ Target Cluster #{order.targetClusterId}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 font-mono">
                      {order.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    From {order.sourceFacilityName} via {order.transportMode} • ETA ~{order.estimatedTransitMinutes}m
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    Payload: {order.itemsRequested.map((i) => `${i.quantity}x ${i.itemName}`).join(', ')}
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-500">
                  {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
