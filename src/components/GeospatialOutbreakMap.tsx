import React, { useState, useMemo, useEffect } from 'react';
import { 
  MapPin, 
  Layers, 
  AlertTriangle, 
  Sliders, 
  Database, 
  Activity, 
  Flame, 
  ShieldAlert, 
  Radio,
  CheckCircle2,
  Compass,
  FileCode,
  Info,
  Bell,
  Sparkles,
  Zap,
  Globe2,
  TrendingUp,
  Snowflake,
  Package,
  Truck,
  Thermometer,
  Send,
  Navigation,
  CornerDownRight,
  FileCheck2,
  Users
} from 'lucide-react';
import { TriageAssessment, OutbreakCluster, NetworkCondition } from '../types';
import { LocalDatabaseService } from '../services/localDatabase';
import { OutbreakAnalyticsService, PostGisQuerySimulation } from '../services/outbreakAnalytics';
import { OutbreakAlertService } from '../services/outbreakAlertService';
import { RecurrentIncidenceInspector } from './RecurrentIncidenceInspector';
import { GlobalHealthDataService } from '../services/globalHealthDataService';
import { 
  ResourceLogisticsService, 
  LogisticalResource, 
  SupplyDispatchOrder 
} from '../services/resourceLogisticsService';
import { ResourceLogisticsPanel } from './ResourceLogisticsPanel';
import { ResourceDispatchModal } from './ResourceDispatchModal';

interface GeospatialOutbreakMapProps {
  selectedClusterId?: number | null;
  onSelectCluster?: (clusterId: number | null) => void;
  networkCondition?: NetworkCondition;
  onOpenAuditModal?: (clusterId?: number) => void;
}

export const GeospatialOutbreakMap: React.FC<GeospatialOutbreakMapProps> = ({
  selectedClusterId: externalSelectedClusterId,
  onSelectCluster,
  networkCondition = 'ONLINE',
  onOpenAuditModal,
}) => {
  const [epsMeters, setEpsMeters] = useState<number>(15000);
  const [minPoints, setMinPoints] = useState<number>(2);
  const [feverThreshold, setFeverThreshold] = useState<number>(38.5);
  const [internalSelectedClusterId, setInternalSelectedClusterId] = useState<number | null>(null);
  const [showSqlInspector, setShowSqlInspector] = useState<boolean>(true);
  const [showRecurrenceInspector, setShowRecurrenceInspector] = useState<boolean>(true);

  // Resource Availability Overlay States
  const [showResourceOverlay, setShowResourceOverlay] = useState<boolean>(true);
  const [resourceFilter, setResourceFilter] = useState<'ALL' | 'COLD_CHAIN' | 'SUPPLY_DEPOT'>('ALL');
  const [showLogisticsVectors, setShowLogisticsVectors] = useState<boolean>(true);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [dispatchModalResource, setDispatchModalResource] = useState<LogisticalResource | null>(null);
  const [dispatchToast, setDispatchToast] = useState<{ id: string; message: string; sub: string } | null>(null);
  const [logisticsPanelTab, setLogisticsPanelTab] = useState<'FACILITIES' | 'DISPATCHES' | 'LOGISTICS_REQUEST'>('FACILITIES');

  const [resources, setResources] = useState<LogisticalResource[]>(ResourceLogisticsService.getAllResources());
  const [dispatchOrders, setDispatchOrders] = useState<SupplyDispatchOrder[]>(ResourceLogisticsService.getDispatchOrders());

  useEffect(() => {
    const unsub = ResourceLogisticsService.subscribe(() => {
      setResources([...ResourceLogisticsService.getAllResources()]);
      setDispatchOrders([...ResourceLogisticsService.getDispatchOrders()]);
    });
    return () => unsub();
  }, []);

  // Sync external selection from Outbreak Alert toasts
  useEffect(() => {
    if (externalSelectedClusterId !== undefined && externalSelectedClusterId !== null) {
      setInternalSelectedClusterId(externalSelectedClusterId);
    }
  }, [externalSelectedClusterId]);

  const selectedClusterId = internalSelectedClusterId;
  const setSelectedClusterId = (id: number | null) => {
    setInternalSelectedClusterId(id);
    if (onSelectCluster) onSelectCluster(id);
  };

  // Fetch all triage assessments from simulated database
  const assessments: TriageAssessment[] = LocalDatabaseService.getTriageAssessments();

  // Run simulated PostGIS spatial query with current parameters
  const postgisResult: PostGisQuerySimulation = useMemo(() => {
    return OutbreakAnalyticsService.runDBSCANClustering(
      assessments,
      epsMeters,
      minPoints,
      feverThreshold
    );
  }, [assessments, epsMeters, minPoints, feverThreshold]);

  // Evaluate clusters via OutbreakAlertService whenever DBSCAN detects or updates clusters
  useEffect(() => {
    if (postgisResult.clusters.length > 0) {
      OutbreakAlertService.evaluateClusters(postgisResult.clusters);
    }
  }, [postgisResult.clusters]);

  // Coordinate projection helper for SVG map
  // Bound approx: Lat 4.15 to 4.26 N, Lng 34.30 to 34.42 E (Turkana Northern Catchment)
  const minLat = 4.180;
  const maxLat = 4.235;
  const minLng = 34.315;
  const maxLng = 34.385;

  const projectToSvg = (lat: number, lng: number): { x: number; y: number } => {
    const width = 640;
    const height = 440;
    const x = ((lng - minLng) / (maxLng - minLng)) * width;
    const y = height - ((lat - minLat) / (maxLat - minLat)) * height;
    return {
      x: Math.max(25, Math.min(width - 25, x)),
      y: Math.max(25, Math.min(height - 25, y)),
    };
  };

  const selectedCluster = postgisResult.clusters.find((c) => c.cluster_id === selectedClusterId);
  const selectedClusterRecurrence = selectedCluster
    ? GlobalHealthDataService.analyzeClusterRecurrence(selectedCluster, 'AFRO_EAST_TURKANA')
    : null;

  // Compute nearest cold chain storage and supply depot to the active outbreak cluster
  const nearestFacilities = useMemo(() => {
    if (!selectedCluster) return null;
    const sorted = [...resources].map((r) => {
      const dist = ResourceLogisticsService.calculateDistanceKm(
        r.latitude,
        r.longitude,
        selectedCluster.centroid_lat,
        selectedCluster.centroid_lng
      );
      const { minutes, recommendedTransport } = ResourceLogisticsService.estimateTransitMinutes(dist, r.transport);
      return { ...r, distanceKm: dist, transitMinutes: minutes, recommendedTransport };
    }).sort((a, b) => a.distanceKm - b.distanceKm);

    const nearestCold = sorted.find((r) => r.type === 'COLD_CHAIN');
    const nearestDepot = sorted.find((r) => r.type === 'SUPPLY_DEPOT');
    return { nearestCold, nearestDepot, allSorted: sorted };
  }, [selectedCluster, resources]);

  const activeFilteredResources = useMemo(() => {
    if (resourceFilter === 'ALL') return resources;
    return resources.filter((r) => r.type === resourceFilter);
  }, [resources, resourceFilter]);

  return (
    <div className="space-y-6">
      {/* Map Header & Outbreak Summary Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs text-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <Radio className="h-3 w-3 animate-pulse text-rose-400" />
              Live Epidemic Surveillance
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Spatial Resolution: EPSG:4326 / GiST Index
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
              <Globe2 className="h-3 w-3" />
              WHO Recurrent Surveillance Active
            </span>
          </div>
          <h2 className="text-lg font-semibold text-white">
            PostGIS Spatiotemporal Outbreak Clustering
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time aggregation of synced febrile &amp; respiratory assessments running DBSCAN density clustering to isolate infectious disease vectors.
          </p>
        </div>

        {/* Global Cluster Counter, Global Health Toggle & Resource Availability Overlay Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowResourceOverlay(!showResourceOverlay)}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all border ${
              showResourceOverlay
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
            title="Toggle nearby cold-chain storage and medical supply depots overlay on the map"
          >
            <Package className="h-4 w-4 text-emerald-400" />
            <span>{showResourceOverlay ? 'Hide Resources' : 'Resource Availability'}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 font-bold">
              {resources.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowRecurrenceInspector(!showRecurrenceInspector)}
            className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all border ${
              showRecurrenceInspector
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 ring-1 ring-blue-500/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
            }`}
            title="Toggle WHO Global Health Recurrent Surveillance Engine"
          >
            <Globe2 className="h-4 w-4 text-blue-400" />
            <span>{showRecurrenceInspector ? 'Hide Recurrence Engine' : 'Check Recurrent Incidence'}</span>
          </button>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Outbreak Clusters</span>
            <span className="text-lg font-bold text-rose-400 font-mono">
              {postgisResult.clustersDetectedCount}
            </span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">High-Risk Cases</span>
            <span className="text-lg font-bold text-amber-400 font-mono">
              {postgisResult.highRiskCasesFiltered}
            </span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">PostGIS Query Latency</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {postgisResult.executionTimeMs}ms
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map Canvas */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-slate-200">
                  Catchment Area Map: Northern Turkana District
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  (4.20° N, 34.35° E)
                </span>
              </div>

              {/* Map Legend & Outbreak Alert Trigger */}
              <div className="flex items-center gap-3 text-[10px]">
                <button
                  type="button"
                  onClick={() => OutbreakAlertService.triggerSimulatedAlert('CRITICAL_OUTBREAK')}
                  className="px-2.5 py-1 rounded bg-rose-600/90 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Simulate a new epidemic cluster detection event and trigger toast alert"
                >
                  <Flame className="h-3 w-3 text-rose-200" />
                  <span>Test Outbreak Alert</span>
                </button>

                <span className="flex items-center gap-1 text-rose-400 font-mono">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span> Emergency Red
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-mono">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span> Urgent Yellow
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Routine Green
                </span>
              </div>
            </div>

            {/* Dispatch Success Alert Banner */}
            {dispatchToast && (
              <div className="mb-3 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg flex items-center justify-between text-xs text-emerald-200 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white font-mono">{dispatchToast.id}: </span>
                    <span>{dispatchToast.message} </span>
                    <span className="text-emerald-400 text-[11px]">({dispatchToast.sub})</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchToast(null)}
                  className="text-emerald-400 hover:text-white px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-500/30 hover:bg-emerald-500/20"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Resource Availability Overlay Controls Bar */}
            {showResourceOverlay && (
              <div className="mb-3 p-2.5 bg-slate-950/90 rounded-lg border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                    <Package className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-slate-200 text-[11px]">Logistics Overlay:</span>
                  
                  {/* Category filter buttons */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setResourceFilter('ALL')}
                      className={`px-2 py-0.5 rounded font-mono transition-colors ${
                        resourceFilter === 'ALL'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All ({resources.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResourceFilter('COLD_CHAIN')}
                      className={`px-2 py-0.5 rounded font-mono flex items-center gap-1 transition-colors ${
                        resourceFilter === 'COLD_CHAIN'
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Snowflake className="h-2.5 w-2.5" />
                      Cold-Chain ({resources.filter(r => r.type === 'COLD_CHAIN').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setResourceFilter('SUPPLY_DEPOT')}
                      className={`px-2 py-0.5 rounded font-mono flex items-center gap-1 transition-colors ${
                        resourceFilter === 'SUPPLY_DEPOT'
                          ? 'bg-emerald-700 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Truck className="h-2.5 w-2.5" />
                      Depots ({resources.filter(r => r.type === 'SUPPLY_DEPOT').length})
                    </button>
                  </div>
                </div>

                {/* Route vectors toggle and active mission badge */}
                <div className="flex items-center gap-2.5 text-[10px]">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-mono select-none">
                    <input
                      type="checkbox"
                      checked={showLogisticsVectors}
                      onChange={(e) => setShowLogisticsVectors(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 accent-emerald-500 h-3 w-3"
                    />
                    <span>Route Vectors (ETA/km)</span>
                  </label>

                  {dispatchOrders.filter(o => o.status === 'EN_ROUTE').length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold flex items-center gap-1 animate-pulse">
                      <Zap className="h-2.5 w-2.5 text-amber-400" />
                      {dispatchOrders.filter(o => o.status === 'EN_ROUTE').length} In-Transit
                    </span>
                  )}

                  {/* Direct shortcut button to Logistics Request module */}
                  <button
                    type="button"
                    onClick={() => {
                      setLogisticsPanelTab('LOGISTICS_REQUEST');
                      const el = document.getElementById('resource-logistics-panel-anchor');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Open Logistics Request broadcast composer in the Resource Overlay"
                  >
                    <Radio className="h-2.5 w-2.5 text-amber-400" />
                    <span>Broadcast Request</span>
                  </button>
                </div>
              </div>
            )}

            {/* SVG Visual Map Stage */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 relative flex items-center justify-center">
              <svg
                viewBox="0 0 640 440"
                className="w-full h-auto max-h-[440px] select-none"
              >
                {/* Background Grid Lines representing UTM 1km spatial grid */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                  </pattern>
                  {/* Radial gradient for outbreak epicenters */}
                  <radialGradient id="clusterGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                  </radialGradient>
                  {/* Radial gradient for cold chain facilities */}
                  <radialGradient id="coldChainGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </radialGradient>
                  {/* Radial gradient for supply depots */}
                  <radialGradient id="depotGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </radialGradient>
                </defs>
                <rect width="640" height="440" fill="url(#grid)" />

                {/* Village Labels */}
                <text x="70" y="80" fill="#475569" fontSize="10" fontFamily="monospace">Songot Ridge (34.331°E, 4.225°N)</text>
                <text x="320" y="210" fill="#475569" fontSize="10" fontFamily="monospace">Lokichoggio Outpost (34.348°E, 4.204°N)</text>
                <text x="390" y="360" fill="#475569" fontSize="10" fontFamily="monospace">Nanam Settlement (34.362°E, 4.190°N)</text>

                {/* Logistics Route Vectors between active cluster & resources */}
                {showResourceOverlay && showLogisticsVectors && postgisResult.clusters.map((cluster) => {
                  if (selectedClusterId && cluster.cluster_id !== selectedClusterId) return null;
                  const cPt = projectToSvg(cluster.centroid_lat, cluster.centroid_lng);

                  return activeFilteredResources.map((res) => {
                    const rPt = projectToSvg(res.latitude, res.longitude);
                    const isSelectedRes = selectedResourceId === res.id;
                    const dist = ResourceLogisticsService.calculateDistanceKm(
                      res.latitude,
                      res.longitude,
                      cluster.centroid_lat,
                      cluster.centroid_lng
                    );
                    const { minutes } = ResourceLogisticsService.estimateTransitMinutes(dist, res.transport);
                    const midX = (cPt.x + rPt.x) / 2;
                    const midY = (cPt.y + rPt.y) / 2;
                    const isCold = res.type === 'COLD_CHAIN';

                    return (
                      <g key={`vector-${cluster.cluster_id}-${res.id}`}>
                        <line
                          x1={cPt.x}
                          y1={cPt.y}
                          x2={rPt.x}
                          y2={rPt.y}
                          stroke={isCold ? '#06b6d4' : '#10b981'}
                          strokeWidth={isSelectedRes ? 2.5 : 1.2}
                          strokeDasharray={isSelectedRes ? 'none' : '4 3'}
                          opacity={isSelectedRes ? 0.95 : 0.4}
                        />
                        {/* Route Distance & ETA badge */}
                        <rect
                          x={midX - 32}
                          y={midY - 8}
                          width="64"
                          height="16"
                          rx="3"
                          fill="#020617"
                          stroke={isCold ? '#06b6d4' : '#10b981'}
                          strokeWidth="0.8"
                          opacity={0.92}
                        />
                        <text
                          x={midX}
                          y={midY + 3.5}
                          fill={isCold ? '#67e8f9' : '#6ee7b7'}
                          fontSize="7.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {dist}km • {minutes}m
                        </text>
                      </g>
                    );
                  });
                })}

                {/* Active In-Transit Missions Animation */}
                {showResourceOverlay && dispatchOrders.filter(o => o.status === 'EN_ROUTE').map((order) => {
                  const f = resources.find(r => r.id === order.facilityId);
                  if (!f) return null;
                  const fPt = projectToSvg(f.latitude, f.longitude);
                  const tPt = projectToSvg(order.targetLat, order.targetLng);
                  const curX = fPt.x + (tPt.x - fPt.x) * 0.48;
                  const curY = fPt.y + (tPt.y - fPt.y) * 0.48;

                  return (
                    <g key={order.orderId} className="cursor-pointer">
                      <circle cx={curX} cy={curY} r={12} fill="#f59e0b" fillOpacity={0.25} className="animate-ping" />
                      <circle cx={curX} cy={curY} r={6} fill="#f59e0b" stroke="#ffffff" strokeWidth={1.5} />
                      <rect x={curX - 40} y={curY - 18} width="80" height="14" rx="3" fill="#0f172a" stroke="#f59e0b" strokeWidth="0.8" />
                      <text x={curX} y={curY - 8} fill="#fde68a" fontSize="7.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        ⚡ {order.transportMode.split(' ')[0]} EN ROUTE
                      </text>
                    </g>
                  );
                })}

                {/* Render PostGIS DBSCAN Cluster Polygons (ST_ConvexHull) */}
                {postgisResult.clusters.map((cluster) => {
                  const centroid = projectToSvg(cluster.centroid_lat, cluster.centroid_lng);
                  const isSelected = selectedClusterId === cluster.cluster_id;

                  // Convert polygon points to SVG path string
                  const pathString = cluster.polygon_points
                    .map((pt, i) => {
                      const proj = projectToSvg(pt[0], pt[1]);
                      return `${i === 0 ? 'M' : 'L'} ${proj.x} ${proj.y}`;
                    })
                    .join(' ') + ' Z';

                  return (
                    <g 
                      key={cluster.cluster_id}
                      onClick={() => setSelectedClusterId(cluster.cluster_id)}
                      className="cursor-pointer transition-all"
                    >
                      {/* Cluster Area Glow */}
                      <circle
                        cx={centroid.x}
                        cy={centroid.y}
                        r={Math.max(35, cluster.radius_meters / 180)}
                        fill="url(#clusterGlow)"
                        className="animate-pulse"
                      />

                      {/* Convex Hull Boundary */}
                      <path
                        d={pathString}
                        fill={isSelected ? '#f43f5e33' : '#f43f5e1a'}
                        stroke="#f43f5e"
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        strokeDasharray={isSelected ? 'none' : '4 3'}
                      />

                      {/* Centroid Marker */}
                      {isSelected && (
                        <circle
                          cx={centroid.x}
                          cy={centroid.y}
                          r={16}
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          className="animate-ping"
                          opacity={0.7}
                        />
                      )}
                      <circle
                        cx={centroid.x}
                        cy={centroid.y}
                        r={isSelected ? 8 : 6}
                        fill="#f43f5e"
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 2 : 1.5}
                      />

                      {/* Cluster Label Pill */}
                      <rect
                        x={centroid.x - 45}
                        y={centroid.y - 28}
                        width="90"
                        height="18"
                        rx="4"
                        fill="#0f172a"
                        stroke="#f43f5e"
                        strokeWidth="1"
                      />
                      <text
                        x={centroid.x}
                        y={centroid.y - 16}
                        fill="#fda4af"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {cluster.severity === 'CRITICAL_OUTBREAK' ? 'CRITICAL (DBSCAN)' : 'HIGH ALERT'}
                      </text>
                    </g>
                  );
                })}

                {/* Render Individual Patient Triage Assessments */}
                {assessments.map((a) => {
                  const pt = projectToSvg(a.latitude, a.longitude);
                  const isRed = a.triage_urgency === 'EMERGENCY_RED';
                  const isYellow = a.triage_urgency === 'URGENT_YELLOW';

                  return (
                    <g key={a.id} className="cursor-pointer">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isRed ? 5 : isYellow ? 4 : 3}
                        fill={isRed ? '#f43f5e' : isYellow ? '#f59e0b' : '#10b981'}
                        stroke="#0f172a"
                        strokeWidth={1}
                      />
                    </g>
                  );
                })}

                {/* Render Cold-Chain Facilities and Supply Depots when Resource Overlay is Active */}
                {showResourceOverlay && activeFilteredResources.map((res) => {
                  const proj = projectToSvg(res.latitude, res.longitude);
                  const isSelected = selectedResourceId === res.id;
                  const isCold = res.type === 'COLD_CHAIN';

                  return (
                    <g
                      key={res.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedResourceId(isSelected ? null : res.id);
                      }}
                      className="cursor-pointer group"
                    >
                      {/* Coverage Radius Circle when Selected */}
                      {isSelected && (
                        <circle
                          cx={proj.x}
                          cy={proj.y}
                          r={Math.min(90, Math.max(40, res.coverageRadiusMeters / 300))}
                          fill={isCold ? 'rgba(6, 182, 212, 0.08)' : 'rgba(16, 185, 129, 0.08)'}
                          stroke={isCold ? '#06b6d4' : '#10b981'}
                          strokeWidth={1.2}
                          strokeDasharray="4 3"
                        />
                      )}

                      {/* Ambient Pulsing Glow on Selected */}
                      {isSelected && (
                        <circle
                          cx={proj.x}
                          cy={proj.y}
                          r={20}
                          fill="none"
                          stroke={isCold ? '#06b6d4' : '#10b981'}
                          strokeWidth={2}
                          className="animate-ping"
                          opacity={0.6}
                        />
                      )}

                      {/* Ambient Background Glow */}
                      <circle
                        cx={proj.x}
                        cy={proj.y}
                        r={14}
                        fill={isCold ? 'url(#coldChainGlow)' : 'url(#depotGlow)'}
                      />

                      {/* Facility Base Shape */}
                      {isCold ? (
                        // Diamond / Rhombus for Cold Chain Facility
                        <polygon
                          points={`${proj.x},${proj.y - 11} ${proj.x + 10},${proj.y} ${proj.x},${proj.y + 11} ${proj.x - 10},${proj.y}`}
                          fill={isSelected ? '#0891b2' : '#0e7490'}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? 2 : 1.2}
                        />
                      ) : (
                        // Rounded Square / Shield for Medical Supply Depot
                        <rect
                          x={proj.x - 9}
                          y={proj.y - 9}
                          width="18"
                          height="18"
                          rx="4"
                          fill={isSelected ? '#059669' : '#047857'}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? 2 : 1.2}
                        />
                      )}

                      {/* Inner Icon Representation */}
                      {isCold ? (
                        <text
                          x={proj.x}
                          y={proj.y + 3.5}
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          ❄
                        </text>
                      ) : (
                        <text
                          x={proj.x}
                          y={proj.y + 3.5}
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          +
                        </text>
                      )}

                      {/* Facility Label Pill */}
                      <g transform={`translate(${proj.x}, ${proj.y + 15})`}>
                        <rect
                          x="-42"
                          y="0"
                          width="84"
                          height="16"
                          rx="3"
                          fill="#020617"
                          stroke={isCold ? (isSelected ? '#22d3ee' : '#06b6d4') : (isSelected ? '#34d399' : '#10b981')}
                          strokeWidth={isSelected ? '1.5' : '0.8'}
                        />
                        <text
                          x="0"
                          y="11"
                          fill={isCold ? '#67e8f9' : '#6ee7b7'}
                          fontSize="7.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {isCold && res.coldChain
                            ? `${res.shortCode} • ${res.coldChain.currentTempCelsius}°C`
                            : `${res.shortCode}`}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>

              {/* Map Footer Helper */}
              <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1 text-[10px] text-slate-400 font-mono backdrop-blur-xs">
                Click any cluster boundary or marker to inspect epidemiological parameters
              </div>
            </div>
          </div>

          {/* Collapsible PostGIS SQL Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                <FileCode className="h-4 w-4 text-blue-400" />
                Live PostGIS Query (03_postgis_outbreak_clustering.sql)
              </span>
              <button
                type="button"
                onClick={() => setShowSqlInspector(!showSqlInspector)}
                className="text-xs text-blue-400 hover:text-blue-300 font-mono underline"
              >
                {showSqlInspector ? 'Collapse Query' : 'Expand Query'}
              </button>
            </div>

            {showSqlInspector && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                <pre>{postgisResult.sqlQuery}</pre>
                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Optimizer: Index Scan using idx_triage_spatial_geom on triage_assessments</span>
                  <span>Execution Time: {postgisResult.executionTimeMs}ms</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Parameters Slider & Cluster Details */}
        <div className="lg:col-span-4 space-y-4 text-xs">
          {/* Spatial Parameter Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-200 font-semibold border-b border-slate-800 pb-2">
              <Sliders className="h-4 w-4 text-emerald-400" />
              <span>DBSCAN Clustering Parameters</span>
            </div>

            {/* Parameter 1: eps distance */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Search Radius (eps in meters):</span>
                <span className="font-bold text-emerald-400 font-mono">{(epsMeters / 1000).toFixed(1)} km</span>
              </div>
              <input
                type="range"
                min="5000"
                max="35000"
                step="1000"
                value={epsMeters}
                onChange={(e) => setEpsMeters(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Represents average walking distance / catchment radius of rural outposts.
              </span>
            </div>

            {/* Parameter 2: min points */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Minimum Cases (minpoints):</span>
                <span className="font-bold text-emerald-400 font-mono">{minPoints} cases</span>
              </div>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={minPoints}
                onChange={(e) => setMinPoints(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Cases required to trigger epidemic cluster classification instead of isolated noise.
              </span>
            </div>

            {/* Parameter 3: Fever threshold */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Fever Filter Threshold:</span>
                <span className="font-bold text-rose-400 font-mono">{feverThreshold}°C</span>
              </div>
              <input
                type="range"
                min="37.5"
                max="39.5"
                step="0.1"
                value={feverThreshold}
                onChange={(e) => setFeverThreshold(parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Syndromic filter for acute febrile respiratory illness (WHO SARI definition).
              </span>
            </div>
          </div>

          {/* Cluster Details Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>Outbreak Surveillance Assessment</span>
            </h3>

            {selectedCluster ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-rose-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 font-mono">Cluster #{selectedCluster.cluster_id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      {selectedCluster.severity}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium">
                    Suspected: {selectedCluster.suspected_pathogen}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Total Cases</span>
                    <strong className="text-white text-sm">{selectedCluster.case_count}</strong>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Mean Temp</span>
                    <strong className="text-rose-400 text-sm">{selectedCluster.avg_temperature}°C</strong>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Resp Risk Ratio</span>
                    <strong className="text-amber-400 text-sm">{selectedCluster.respiratory_risk_ratio}%</strong>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Cluster Radius</span>
                    <strong className="text-slate-300 text-sm">{selectedCluster.radius_meters}m</strong>
                  </div>
                </div>

                {/* Epidemiological Demographic Breakdown Card */}
                {selectedCluster.demographic_breakdown && (
                  <div className="p-3 bg-slate-950 rounded-lg border border-indigo-500/30 text-[11px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                        Epidemiological Demographics
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        DBSCAN Stratified
                      </span>
                    </div>

                    {/* Key Ratios */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">Pediatric Ratio (Under-12)</span>
                        <strong className={`text-xs ${
                          selectedCluster.demographic_breakdown.pediatric_vulnerability_pct >= 50
                            ? 'text-rose-400'
                            : 'text-slate-200'
                        }`}>
                          {selectedCluster.demographic_breakdown.pediatric_vulnerability_pct}%
                        </strong>
                      </div>
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block text-[9px]">Female / Male Ratio</span>
                        <strong className="text-slate-200 text-xs">
                          {selectedCluster.demographic_breakdown.female_pct}% F • {Math.round(100 - selectedCluster.demographic_breakdown.female_pct)}% M
                        </strong>
                      </div>
                    </div>

                    {/* Age Group Distribution Bars */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Age Cohort Counts:</span>
                        <span className="text-emerald-400 font-mono text-[9px]">
                          Predominant: {selectedCluster.demographic_breakdown.predominant_age_group} yrs
                        </span>
                      </div>
                      <div className="grid grid-cols-6 gap-1 text-[9px] font-mono text-center">
                        {(['0-5', '6-12', '13-17', '18-49', '50-64', '65+'] as const).map((bracket) => {
                          const count = selectedCluster.demographic_breakdown?.age_groups[bracket] || 0;
                          const isPredominant = selectedCluster.demographic_breakdown?.predominant_age_group === bracket;
                          return (
                            <div
                              key={bracket}
                              className={`p-1 rounded border ${
                                isPredominant
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              <div>{bracket}</div>
                              <div className="text-[10px] text-white font-bold">{count}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {selectedCluster.demographic_breakdown.pediatric_vulnerability_pct >= 50 && (
                      <div className="text-[10px] text-rose-300 bg-rose-950/40 border border-rose-500/30 p-1.5 rounded">
                        ⚠️ <strong>Pediatric Surge Detected:</strong> High concentration of cases in children under 12. Prioritize pediatric amoxicillin, oral rehydration salts, and nebulized bronchodilator packs.
                      </div>
                    )}
                  </div>
                )}

                {/* Global Health Recurrence Match Breakdown */}
                {selectedClusterRecurrence && (
                  <div className="p-2.5 bg-blue-950/30 border border-blue-500/30 rounded text-[11px] text-blue-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                        <Globe2 className="h-3.5 w-3.5 text-blue-400" />
                        WHO Surveillance Match:
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        selectedClusterRecurrence.isThresholdExceeded
                          ? 'bg-rose-500 text-white'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {selectedClusterRecurrence.isThresholdExceeded ? 'Surge Breach' : 'Cyclic Peak'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-300 space-y-0.5">
                      <div>
                        <strong className="text-white">{selectedClusterRecurrence.diseaseName}</strong>: {selectedClusterRecurrence.recurrencePeriodicity}
                      </div>
                      <div className="font-mono text-slate-400">
                        Est. Rate: <span className="text-rose-300 font-bold">{selectedClusterRecurrence.estimatedClusterRate}/100k</span> | Epidemic Trigger: {selectedClusterRecurrence.epidemicThresholdRate}/100k
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-2.5 bg-rose-950/20 border border-rose-800/40 rounded text-[11px] text-slate-300 space-y-1">
                  <strong className="text-rose-300 block">Recommended Intervention:</strong>
                  <span>{selectedClusterRecurrence?.recommendedProtocol || 'Dispatch mobile rapid antigen tests, portable pulse oximeters, and nebulized bronchodilators to health workers in this catchment zone.'}</span>
                </div>

                {/* Nearest Logistical Support & Cold Chain Integration */}
                {nearestFacilities && (
                  <div className="p-3 bg-slate-950 rounded-lg border border-emerald-500/30 text-[11px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-emerald-400" />
                        Immediate Logistical Support
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Proximity Sort</span>
                    </div>

                    <div className="space-y-2 text-[10px]">
                      {nearestFacilities.nearestCold && (
                        <div className="p-2 rounded bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Snowflake className="h-3 w-3 text-cyan-400" />
                              <strong className="text-white">{nearestFacilities.nearestCold.name}</strong>
                            </div>
                            <div className="text-slate-400 font-mono">
                              {nearestFacilities.nearestCold.distanceKm} km • ~{nearestFacilities.nearestCold.transitMinutes} min transit
                              {nearestFacilities.nearestCold.coldChain && (
                                <span className="ml-1 text-cyan-300">({nearestFacilities.nearestCold.coldChain.currentTempCelsius}°C)</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDispatchModalResource(nearestFacilities.nearestCold!)}
                            className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold font-mono flex items-center gap-1 transition-colors shrink-0 shadow-xs"
                          >
                            <Send className="h-2.5 w-2.5" />
                            Dispatch
                          </button>
                        </div>
                      )}

                      {nearestFacilities.nearestDepot && (
                        <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Truck className="h-3 w-3 text-emerald-400" />
                              <strong className="text-white">{nearestFacilities.nearestDepot.name}</strong>
                            </div>
                            <div className="text-slate-400 font-mono">
                              {nearestFacilities.nearestDepot.distanceKm} km • ~{nearestFacilities.nearestDepot.transitMinutes} min transit
                              {nearestFacilities.nearestDepot.transport[0] && (
                                <span className="ml-1 text-emerald-300">
                                  ({nearestFacilities.nearestDepot.transport[0].vehicleType.replace('_', ' ')})
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDispatchModalResource(nearestFacilities.nearestDepot!)}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold font-mono flex items-center gap-1 transition-colors shrink-0 shadow-xs"
                          >
                            <Send className="h-2.5 w-2.5" />
                            Dispatch
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Encrypted Cluster Audit Report Export Button */}
                {onOpenAuditModal && (
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => onOpenAuditModal(selectedCluster.cluster_id)}
                      className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                      title="Generate locally stored, encrypted PDF summary of this cluster for regulatory clinic audit"
                    >
                      <FileCheck2 className="h-4 w-4" />
                      <span>Export Cluster #{selectedCluster.cluster_id} Encrypted Audit PDF</span>
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1 text-center font-mono">
                      AES-GCM-256 encrypted • SHA-256 sealed paper-trail
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-slate-950 rounded-lg border border-slate-800 text-center text-slate-500 space-y-2">
                <Info className="h-6 w-6 mx-auto text-slate-600" />
                <p>Click on any red cluster outline in the map to view detailed outbreak metrics and identify nearest logistics depots.</p>
              </div>
            )}
          </div>

          {/* Resource Logistics Panel (Cold Chain Telemetry, Supply Depots & Broadcast Requests) */}
          <div id="resource-logistics-panel-anchor">
            <ResourceLogisticsPanel
              key={logisticsPanelTab}
              resources={resources}
              dispatchOrders={dispatchOrders}
              activeCluster={selectedCluster || null}
              selectedResourceId={selectedResourceId}
              onSelectResource={(id) => setSelectedResourceId(id)}
              onRequestDispatch={(res) => setDispatchModalResource(res)}
              networkCondition={networkCondition}
              initialTab={logisticsPanelTab}
            />
          </div>
        </div>
      </div>

      {/* Emergency Supply Dispatch Modal */}
      {dispatchModalResource && (
        <ResourceDispatchModal
          resource={dispatchModalResource}
          activeCluster={selectedCluster || null}
          onClose={() => setDispatchModalResource(null)}
          onDispatched={(order: SupplyDispatchOrder) => {
            setDispatchToast({
              id: order.orderId,
              message: `Supply dispatch confirmed to Cluster #${order.targetClusterId}`,
              sub: `${order.itemsRequested.map((i) => `${i.quantity}x ${i.itemName}`).join(', ')} via ${order.transportMode} (ETA ~${order.estimatedTransitMinutes}m)`
            });
            setDispatchModalResource(null);
          }}
        />
      )}

      {/* Embedded Global Health Recurrent Incidence Inspector */}
      {showRecurrenceInspector && (
        <RecurrentIncidenceInspector
          activeClusters={postgisResult.clusters}
          onSelectCluster={(id) => setSelectedClusterId(id)}
        />
      )}
    </div>
  );
};
