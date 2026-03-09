import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeEmail } from '../common/utils/email.util';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { UpsertPreferencesDto } from './dto/upsert-preferences.dto';
import { AddPhotoDto } from './dto/add-photo.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfileByEmail(rawEmail: string) {
    const email = normalizeEmail(rawEmail);
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        preferences: true,
        photos: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found. Please login first.');
    }

    return {
      email: user.email,
      profile: user.profile,
      preferences: user.preferences,
      photos: user.photos,
      completion: this.computeCompletion(
        user.profile,
        user.preferences,
        user.photos.length,
      ),
    };
  }

  async upsertProfile(input: UpsertProfileDto) {
    const user = await this.requireUser(input.email);

    const profile = await this.prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        displayName: input.displayName,
        dob: new Date(input.dob),
        gender: input.gender,
        bio: input.bio,
        faculty: input.faculty,
        courseYear: input.courseYear,
      },
      create: {
        userId: user.id,
        displayName: input.displayName,
        dob: new Date(input.dob),
        gender: input.gender,
        bio: input.bio,
        faculty: input.faculty,
        courseYear: input.courseYear,
      },
    });

    return { success: true, profile };
  }

  async upsertPreferences(input: UpsertPreferencesDto) {
    if (input.minAge > input.maxAge) {
      throw new BadRequestException(
        'minAge must be less than or equal to maxAge.',
      );
    }

    const user = await this.requireUser(input.email);

    const preferences = await this.prisma.preference.upsert({
      where: { userId: user.id },
      update: {
        minAge: input.minAge,
        maxAge: input.maxAge,
        distanceKm: input.distanceKm,
        interestedIn: input.interestedIn,
      },
      create: {
        userId: user.id,
        minAge: input.minAge,
        maxAge: input.maxAge,
        distanceKm: input.distanceKm,
        interestedIn: input.interestedIn,
      },
    });

    return { success: true, preferences };
  }

  async addPhoto(input: AddPhotoDto) {
    const user = await this.requireUser(input.email);

    const photo = await this.prisma.photo.create({
      data: {
        userId: user.id,
        url: input.url,
        orderIndex: input.orderIndex,
      },
    });

    return { success: true, photo };
  }

  async removePhoto(rawEmail: string, photoId: string) {
    const user = await this.requireUser(rawEmail);

    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
    });
    if (!photo || photo.userId !== user.id) {
      throw new NotFoundException('Photo not found.');
    }

    await this.prisma.photo.delete({ where: { id: photo.id } });
    return { success: true };
  }

  private async requireUser(rawEmail: string) {
    const email = normalizeEmail(rawEmail);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found. Please login first.');
    }

    return user;
  }

  private computeCompletion(
    profile: {
      displayName: string;
      dob: Date;
      bio: string;
      gender: string;
    } | null,
    preferences: { minAge: number; maxAge: number; distanceKm: number } | null,
    photoCount: number,
  ) {
    const hasProfile = Boolean(
      profile?.displayName && profile?.dob && profile?.bio && profile?.gender,
    );
    const hasPreferences = Boolean(
      preferences?.minAge && preferences?.maxAge && preferences?.distanceKm,
    );
    const hasPhotos = photoCount >= 2;

    const completed = [hasProfile, hasPreferences, hasPhotos].filter(
      Boolean,
    ).length;

    return {
      isComplete: hasProfile && hasPreferences && hasPhotos,
      completedSections: completed,
      totalSections: 3,
      photoCount,
    };
  }
}
