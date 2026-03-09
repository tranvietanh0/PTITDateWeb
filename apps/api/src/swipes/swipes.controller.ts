import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateSwipeDto } from './dto/create-swipe.dto';
import { MatchesQueryDto } from './dto/matches-query.dto';
import { SwipesService } from './swipes.service';

@Controller()
export class SwipesController {
  constructor(private readonly swipesService: SwipesService) {}

  @Post('swipes')
  createSwipe(@Body() body: CreateSwipeDto) {
    return this.swipesService.createSwipe(body);
  }

  @Get('matches')
  getMatches(@Query() query: MatchesQueryDto) {
    return this.swipesService.getMatchesByEmail(query.email);
  }
}
