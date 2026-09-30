export interface ColdChainTelemetry {
  currentTempCelsius: number;
  minTempThreshold: number;
  maxTempThreshold: number;
  batteryReserveHours: number;
  isWithinThreshold: boolean;
}

export interface FacilityTransportUnit {
  vehicleType: string;
  isAvailable: boolean;
  maxSpeedKmh: number;
}

export interface LogisticalResource {
  id: string;
  name: string;
  shortCode: string;
  type: 'COLD_CHAIN' | 'SUPPLY_DEPOT' | 'REGIONAL_HOSPITAL' | 'AIRSTRIP';
  latitude: number;
  longitude: number;
  coverageRadiusMeters: number;
  transport: FacilityTransportUnit[];
  inventory: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }>;
  temperatureCelsius?: number;
  batteryBackupHours?: number;
  operationalStatus: 'NORMAL' | 'LIMITED' | 'CRITICAL';
  coldChain?: ColdChainTelemetry;
}

export interface SupplyDispatchOrder {
  orderId: string;
  targetClusterId: number;
  facilityId: string;
  sourceFacilityId: string;
  sourceFacilityName: string;
  targetLat: number;
  targetLng: number;
  itemsRequested: Array<{
    itemName: string;
    quantity: number;
  }>;
  transportMode: string;
  estimatedTransitMinutes: number;
  status: 'EN_ROUTE' | 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
  timestamp: string;
}

const INITIAL_RESOURCES: LogisticalResource[] = [
  {
    id: 'res-lokichoggio-subcounty',
    name: 'Lokichoggio Sub-County Outpost Depot',
    shortCode: 'LOKI-DEPOT-1',
    type: 'COLD_CHAIN',
    latitude: 4.2185,
    longitude: 34.3595,
    coverageRadiusMeters: 25000,
    transport: [
      { vehicleType: '4WD_AMBULANCE', isAvailable: true, maxSpeedKmh: 50 },
      { vehicleType: 'MOTO_COURIER', isAvailable: true, maxSpeedKmh: 40 },
    ],
    inventory: [
      { name: 'Oral Rehydration Salts', quantity: 240, unit: 'sachets', category: 'MEDICATION' },
      { name: 'Amoxicillin Dispersible 250mg', quantity: 180, unit: 'blisters', category: 'MEDICATION' },
      { name: 'Pediatric RSV Rapid Tests', quantity: 95, unit: 'kits', category: 'DIAGNOSTICS' },
      { name: 'Portable Pulse Oximeters', quantity: 12, unit: 'units', category: 'DIAGNOSTICS' },
    ],
    temperatureCelsius: 4.2,
    batteryBackupHours: 36,
    operationalStatus: 'NORMAL',
    coldChain: {
      currentTempCelsius: 4.2,
      minTempThreshold: 2.0,
      maxTempThreshold: 8.0,
      batteryReserveHours: 36,
      isWithinThreshold: true,
    },
  },
  {
    id: 'res-kakuma-central-hub',
    name: 'Kakuma Regional Logistics Hub',
    shortCode: 'KAKUMA-HUB',
    type: 'SUPPLY_DEPOT',
    latitude: 4.1950,
    longitude: 34.3320,
    coverageRadiusMeters: 35000,
    transport: [
      { vehicleType: 'MOTO_COURIER', isAvailable: true, maxSpeedKmh: 45 },
      { vehicleType: 'CARGO_DRONE', isAvailable: true, maxSpeedKmh: 90 },
    ],
    inventory: [
      { name: 'Nebulized Salbutamol', quantity: 70, unit: 'vials', category: 'RESPIRATORY' },
      { name: 'Oxygen Concentrators (10L)', quantity: 4, unit: 'machines', category: 'RESPIRATORY' },
      { name: 'IV Ringers Lactate 500ml', quantity: 120, unit: 'bags', category: 'FLUIDS_IV' },
    ],
    temperatureCelsius: 21.0,
    batteryBackupHours: 72,
    operationalStatus: 'NORMAL',
  },
  {
    id: 'res-lodwar-hospital',
    name: 'Lodwar County Referral Hospital Depot',
    shortCode: 'LODWAR-REF',
    type: 'REGIONAL_HOSPITAL',
    latitude: 4.2350,
    longitude: 34.3820,
    coverageRadiusMeters: 45000,
    transport: [
      { vehicleType: 'CARGO_DRONE', isAvailable: true, maxSpeedKmh: 95 },
      { vehicleType: 'AEROMEDICAL', isAvailable: true, maxSpeedKmh: 220 },
    ],
    inventory: [
      { name: 'Emergency Blood Units (O-Neg)', quantity: 8, unit: 'units', category: 'MEDICATION' },
      { name: 'Critical Pediatric Antibiotics IV', quantity: 50, unit: 'vials', category: 'MEDICATION' },
    ],
    temperatureCelsius: 3.8,
    batteryBackupHours: 48,
    operationalStatus: 'NORMAL',
    coldChain: {
      currentTempCelsius: 3.8,
      minTempThreshold: 2.0,
      maxTempThreshold: 8.0,
      batteryReserveHours: 48,
      isWithinThreshold: true,
    },
  },
];

const INITIAL_DISPATCH_ORDERS: SupplyDispatchOrder[] = [
  {
    orderId: 'DSP-2026-981',
    targetClusterId: 1,
    facilityId: 'res-lokichoggio-subcounty',
    sourceFacilityId: 'res-lokichoggio-subcounty',
    sourceFacilityName: 'Lokichoggio Sub-County Outpost Depot',
    targetLat: 4.2180,
    targetLng: 34.3620,
    itemsRequested: [
      { itemName: 'Oral Rehydration Salts', quantity: 50 },
      { itemName: 'Pediatric RSV Rapid Tests', quantity: 20 },
    ],
    transportMode: 'MOTO_COURIER',
    estimatedTransitMinutes: 28,
    status: 'EN_ROUTE',
    timestamp: '2026-09-29T18:30:00Z',
  },
];

export class ResourceLogisticsService {
  private static resources: LogisticalResource[] = [...INITIAL_RESOURCES];
  private static dispatchOrders: SupplyDispatchOrder[] = [...INITIAL_DISPATCH_ORDERS];
  private static listeners: Array<() => void> = [];

  public static getAllResources(): LogisticalResource[] {
    return [...this.resources];
  }

  public static getDispatchOrders(): SupplyDispatchOrder[] {
    return [...this.dispatchOrders];
  }

  public static subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  public static calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  }

  public static estimateTransitMinutes(
    distKm: number,
    transport: FacilityTransportUnit[] | string
  ): { minutes: number; recommendedTransport: string } {
    let mode = 'MOTO_COURIER';
    let speedKmh = 40;

    if (Array.isArray(transport) && transport.length > 0) {
      mode = transport[0].vehicleType;
      speedKmh = transport[0].maxSpeedKmh || 40;
    } else if (typeof transport === 'string') {
      mode = transport;
      if (mode.includes('DRONE')) speedKmh = 90;
      else if (mode.includes('AMBULANCE')) speedKmh = 50;
      else if (mode.includes('AERO')) speedKmh = 220;
    }

    const minutes = Math.max(5, Math.round((distKm / speedKmh) * 60) + 8);
    return {
      minutes,
      recommendedTransport: mode,
    };
  }

  public static createDispatchOrder(order: Partial<SupplyDispatchOrder>): SupplyDispatchOrder {
    const newOrder: SupplyDispatchOrder = {
      orderId: `DSP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      targetClusterId: order.targetClusterId ?? 1,
      facilityId: order.facilityId || order.sourceFacilityId || 'res-lokichoggio-subcounty',
      sourceFacilityId: order.sourceFacilityId || 'res-lokichoggio-subcounty',
      sourceFacilityName: order.sourceFacilityName || 'Lokichoggio Sub-County Outpost Depot',
      targetLat: order.targetLat ?? 4.218,
      targetLng: order.targetLng ?? 34.362,
      itemsRequested: order.itemsRequested || [],
      transportMode: order.transportMode || 'MOTO_COURIER',
      estimatedTransitMinutes: order.estimatedTransitMinutes || 25,
      status: 'EN_ROUTE',
      timestamp: new Date().toISOString(),
    };
    this.dispatchOrders = [newOrder, ...this.dispatchOrders];
    this.notify();
    return newOrder;
  }

  private static notify() {
    this.listeners.forEach((fn) => fn());
  }
}
