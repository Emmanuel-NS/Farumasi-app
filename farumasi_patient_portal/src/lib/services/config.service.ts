import { api } from "@/lib/api";

export interface DeliveryQuote {
  distance_km: number;
  road_distance_km: number;
  delivery_fee_rwf: number;
  delivery_available: boolean;
  pickup_only_reason?: string | null;
  max_delivery_km: number;
}

export interface PublicPaymentConfig {
  methods: string[];
  processing_fee_percent: number;
  manual_momo?: {
    enabled: boolean;
    merchant_name?: string;
    pay_code?: string | null;
    dial_string?: string | null;
    instructions?: string | null;
  } | null;
}

export interface PublicConfig {
  payments: PublicPaymentConfig;
}

export const configService = {
  async getPublicConfig(): Promise<PublicConfig> {
    const { data } = await api.get<PublicConfig>("/config/public");
    return data;
  },

  async getDeliveryQuote(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
  ): Promise<DeliveryQuote> {
    const { data } = await api.get<DeliveryQuote>("/config/delivery-quote", {
      params: {
        from_lat: fromLat,
        from_lon: fromLon,
        to_lat: toLat,
        to_lon: toLon,
      },
    });
    return data;
  },

  async getRoadDistances(
    fromLat: number,
    fromLon: number,
    destinations: Array<{ id: string; lat: number; lon: number }>,
  ): Promise<Array<{ id: string; distanceKm: number; roadDistanceKm: number }>> {
    if (destinations.length === 0) return [];
    const { data } = await api.post<{
      distances: Array<{ id: string; distance_km: number; road_distance_km: number }>;
    }>("/config/road-distances", {
      from_lat: fromLat,
      from_lon: fromLon,
      destinations: destinations.map((d) => ({
        id: d.id,
        lat: d.lat,
        lon: d.lon,
      })),
    });
    return data.distances.map((d) => ({
      id: d.id,
      distanceKm: d.distance_km,
      roadDistanceKm: d.road_distance_km,
    }));
  },
};
