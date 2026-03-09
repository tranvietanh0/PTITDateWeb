import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { DiscoveryQueryDto } from './dto/discovery-query.dto';
import { DiscoveryService } from './discovery.service';

@Controller('discovery')
@UseGuards(JwtAccessGuard)
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get()
  getFeed(@CurrentUserId() userId: string, @Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getFeed({
      userId,
      limit: query.limit ?? 20,
      cursor: query.cursor,
    });
  }
}
