import React from 'react';
import { Globe2, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import { OutbreakCluster } from '../types';

export interface RecurrentIncidenceInspectorProps {
  activeClusters: OutbreakCluster[];
  onSelectCluster: (clusterId: number) => void;
  onClose?: () => void;
}

export const RecurrentIncidenceInspector: React.FC<RecurrentIncidenceInspectorProps> = ({
  activeClusters,
  onSelectCluster,
  onClose,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
            <Globe2 className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-white">WHO / Global Health Surveillance Inspector</h4>
            <p className="text-[11px] text-slate-400">Historical epidemic wave alignment and recurrence patterns</p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        )}
      </div>

      <div className="space-y-2">
        {activeClusters.map((c) => {
          const pediatricPct = c.demographic_breakdown?.pediatric_vulnerability_pct ?? 45;
          const isSurge = pediatricPct > 40;
          return (
            <div
              key={c.cluster_id}
              onClick={() => onSelectCluster(c.cluster_id)}
              className="p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Cluster #{c.cluster_id} ({c.cluster_label})</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/20 text-blue-300">
                    {c.case_count} cases
                  </span>
                  {isSurge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Pediatric Surge ({pediatricPct}%)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Suspected Pathogen: <strong className="text-cyan-300">{c.suspected_pathogen}</strong> • Predominant Age: {c.demographic_breakdown?.predominant_age_group || '0-5'}
                </div>
              </div>
              <button
                type="button"
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold"
              >
                Inspect
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
