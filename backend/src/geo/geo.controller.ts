import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { GeoService } from './geo.service';

@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('check-availability')
  async checkAvailability(
    @Query('lat') latStr: string,
    @Query('lng') lngStr: string
  ) {
    if (!latStr || !lngStr) {
      throw new BadRequestException('Latitude and longitude are required');
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestException('Invalid coordinates');
    }

    const nearbyTechs = await this.geoService.findNearbyTechnicians(lat, lng);

    return {
      available: nearbyTechs.length > 0,
      techniciansCount: nearbyTechs.length
    };
  }
}
