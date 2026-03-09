import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { ProfilesService } from './profiles.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { UpsertPreferencesDto } from './dto/upsert-preferences.dto';
import { AddPhotoDto } from './dto/add-photo.dto';

@Controller('profiles')
@UseGuards(JwtAccessGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  async getProfile(@CurrentUserId() userId: string) {
    return this.profilesService.getProfileByUserId(userId);
  }

  @Put()
  async upsertProfile(
    @CurrentUserId() userId: string,
    @Body() body: UpsertProfileDto,
  ) {
    return this.profilesService.upsertProfile(userId, body);
  }

  @Put('preferences')
  async upsertPreferences(
    @CurrentUserId() userId: string,
    @Body() body: UpsertPreferencesDto,
  ) {
    return this.profilesService.upsertPreferences(userId, body);
  }

  @Post('photos')
  async addPhoto(@CurrentUserId() userId: string, @Body() body: AddPhotoDto) {
    return this.profilesService.addPhoto(userId, body);
  }

  @Delete('photos/:photoId')
  async deletePhoto(
    @CurrentUserId() userId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.profilesService.removePhoto(userId, photoId);
  }
}
