import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  Query,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { ProfileEmailQueryDto } from './dto/profile-email-query.dto';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { UpsertPreferencesDto } from './dto/upsert-preferences.dto';
import { AddPhotoDto } from './dto/add-photo.dto';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  async getProfile(@Query() query: ProfileEmailQueryDto) {
    return this.profilesService.getProfileByEmail(query.email);
  }

  @Put()
  async upsertProfile(@Body() body: UpsertProfileDto) {
    return this.profilesService.upsertProfile(body);
  }

  @Put('preferences')
  async upsertPreferences(@Body() body: UpsertPreferencesDto) {
    return this.profilesService.upsertPreferences(body);
  }

  @Post('photos')
  async addPhoto(@Body() body: AddPhotoDto) {
    return this.profilesService.addPhoto(body);
  }

  @Delete('photos/:photoId')
  async deletePhoto(
    @Param('photoId') photoId: string,
    @Query() query: ProfileEmailQueryDto,
  ) {
    return this.profilesService.removePhoto(query.email, photoId);
  }
}
