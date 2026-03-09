import { Controller, Get, Query } from '@nestjs/common';
import { DiscoveryQueryDto } from './dto/discovery-query.dto';
import { DiscoveryService } from './discovery.service';

@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get()
  getFeed(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getFeed(query.email, query.limit ?? 20);
  }
}
