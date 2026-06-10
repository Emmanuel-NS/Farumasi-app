import { api } from "@/lib/api";

export interface DeliveryQuote {
  distance_km: number;
  road_distance_km: number;
  delivery_fee_rwf: number;
  delivery_available: boolean;
  pickup_only_reason?: string | null;
  max_delivery_km: number;
}

export const configService = {
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
};
