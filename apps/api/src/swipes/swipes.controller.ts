import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { CreateSwipeDto } from './dto/create-swipe.dto';
import { SwipesService } from './swipes.service';

@Controller()
@UseGuards(JwtAccessGuard)
export class SwipesController {
  constructor(private readonly swipesService: SwipesService) {}

  @Post('swipes')
  createSwipe(@CurrentUserId() userId: string, @Body() body: CreateSwipeDto) {
    return this.swipesService.createSwipe({ ...body, userId });
  }

  @Get('matches')
  getMatches(@CurrentUserId() userId: string) {
    return this.swipesService.getMatchesByUserId(userId);
  }
}
