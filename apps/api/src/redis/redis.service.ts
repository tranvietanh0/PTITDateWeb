import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly memoryStore = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
  }

  async setWithTtl(key: string, value: string, ttlSeconds: number) {
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    } catch {
      this.memoryStore.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      const record = this.memoryStore.get(key);
      if (!record) {
        return null;
      }

      if (Date.now() > record.expiresAt) {
        this.memoryStore.delete(key);
        return null;
      }

      return record.value;
    }
  }

  async del(key: string) {
    try {
      await this.client.del(key);
    } catch {
      this.memoryStore.delete(key);
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch {
      this.memoryStore.clear();
    }
  }
}
