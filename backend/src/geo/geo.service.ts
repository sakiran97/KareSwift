import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '../config/config.service';

export interface NearbyTechnician {
  userId: number;
  shopName: string | null;
  shopLatitude: number | null;
  shopLongitude: number | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  distanceKm: number;
  user: {
    id: number;
    name: string | null;
    phone: string | null;
    technicianId: string | null;
    averageRating: number | null;
    totalReviews: number | null;
  };
}

@Injectable()
export class GeoService {
  private useMock = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Haversine formula: Calculate the distance between two GPS coordinates in km.
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Find all online, KYC-approved technicians within the configured service radius
   * of the given coordinates. Sorted by distance (nearest first).
   */
  async findNearbyTechnicians(
    latitude: number,
    longitude: number,
    radiusKmOverride?: number,
  ): Promise<NearbyTechnician[]> {
    const radiusKm = radiusKmOverride ?? (await this.configService.getNumber('service_radius_km'));

    if (!this.useMock) {
      try {
        // Fetch all online, approved technicians
        const profiles = await this.prisma.technicianProfile.findMany({
          where: {
            isOnline: true,
            kycStatus: 'approved',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                technicianId: true,
                averageRating: true,
                totalReviews: true,
              },
            },
          },
        });

        // Calculate distance and filter by radius
        const nearby: NearbyTechnician[] = [];
        for (const profile of profiles) {
          // Use current live location if available, otherwise fall back to shop location
          const techLat = profile.currentLatitude ?? profile.shopLatitude;
          const techLon = profile.currentLongitude ?? profile.shopLongitude;

          if (techLat == null || techLon == null) continue;

          const distance = this.calculateDistance(latitude, longitude, techLat, techLon);
          if (distance <= radiusKm) {
            nearby.push({
              userId: profile.userId,
              shopName: profile.shopName,
              shopLatitude: profile.shopLatitude,
              shopLongitude: profile.shopLongitude,
              currentLatitude: profile.currentLatitude,
              currentLongitude: profile.currentLongitude,
              distanceKm: Math.round(distance * 100) / 100, // 2 decimal places
              user: profile.user,
            });
          }
        }

        // Sort by distance
        nearby.sort((a, b) => a.distanceKm - b.distanceKm);
        return nearby;
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    // Mock fallback: return empty (no nearby technicians in mock mode)
    return [];
  }

  /**
   * Check if a specific technician is within range of a given location.
   */
  async isTechnicianNearby(
    technicianUserId: number,
    latitude: number,
    longitude: number,
    radiusKmOverride?: number,
  ): Promise<{ nearby: boolean; distanceKm: number | null }> {
    const radiusKm = radiusKmOverride ?? (await this.configService.getNumber('service_radius_km'));

    if (!this.useMock) {
      try {
        const profile = await this.prisma.technicianProfile.findUnique({
          where: { userId: technicianUserId },
        });

        if (!profile) return { nearby: false, distanceKm: null };

        const techLat = profile.currentLatitude ?? profile.shopLatitude;
        const techLon = profile.currentLongitude ?? profile.shopLongitude;

        if (techLat == null || techLon == null) return { nearby: false, distanceKm: null };

        const distance = this.calculateDistance(latitude, longitude, techLat, techLon);
        return {
          nearby: distance <= radiusKm,
          distanceKm: Math.round(distance * 100) / 100,
        };
      } catch (err: any) {
        if (this.isDbOffline(err)) {
          this.useMock = true;
        } else {
          throw err;
        }
      }
    }

    return { nearby: false, distanceKm: null };
  }

  private isDbOffline(err: any): boolean {
    return err.code === 'ECONNREFUSED' || err.message?.includes('conn') || err.message?.includes('refused');
  }

  /**
   * Mock Google Maps Distance Matrix API: Calculate ETA based on distance and simulated traffic
   */
  async getRouteETA(originLat: number, originLng: number, destLat: number, destLng: number): Promise<{ distanceKm: number, etaMinutes: number }> {
    const distanceKm = this.calculateDistance(originLat, originLng, destLat, destLng);
    
    // Assume average speed is 30 km/h in city traffic -> 2 mins per km
    let baseEtaMinutes = distanceKm * 2;

    // Simulate traffic multiplier based on hour of day
    const currentHour = new Date().getHours();
    let trafficMultiplier = 1.0;
    
    if ((currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 20)) {
      trafficMultiplier = 1.5; // Rush hour
    } else if (currentHour >= 22 || currentHour <= 5) {
      trafficMultiplier = 0.8; // Night time, fast
    }

    const etaMinutes = Math.round(baseEtaMinutes * trafficMultiplier);

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      etaMinutes: Math.max(etaMinutes, 1) // minimum 1 minute
    };
  }
}
