import { redis } from './redis';

const DEFAULT_TTL_SECONDS = 60; // cache GitHub data for 1 minute

export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<T> {
  const cached = await redis.get(key);

  if (cached) {
    console.log(`[Cache] HIT: ${key}`);
    return JSON.parse(cached) as T;
  }

  console.log(`[Cache] MISS: ${key}`);
  const result = await fetchFn();
  await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds);
  return result;
}
