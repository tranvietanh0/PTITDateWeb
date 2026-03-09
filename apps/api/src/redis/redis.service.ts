import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
  }

  async setWithTtl(key: string, value: string, ttlSeconds: number) {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
