import { IUserRepo } from "../../domain/interfaces/dbInterfaces/Irepos/IUserRepo";
import { User } from "../../domain/entities/User";
import { IRedisService } from "../../domain/interfaces/cacheInterfaces/IRedisService";

/**
 * Decorator repo that adds Redis cache for simple lookups.
 * - getUserById: cache-aside with TTL (default 10 min)
 * - addUser: writes through then invalide la clé du nouvel utilisateur
 * - getUsers/searchUsersByName: pass-through (pas de cache par défaut)
 */
export class CachedUsersRepo implements IUserRepo {
  private readonly ttlSeconds: number;

  constructor(
    private readonly inner: IUserRepo,
    private readonly redis: IRedisService,
    ttlSeconds: number = 600
  ) {
    this.ttlSeconds = ttlSeconds;
  }

  async addUser(user: User): Promise<User> {
    const created = await this.inner.addUser(user);
    try {
      await this.redis.del(`cache:user:${created.id}`);
    } catch {}
    return created;
  }

  getUsers(): Promise<User[]> {
    return this.inner.getUsers();
  }

  async getUserById(id: string): Promise<User | undefined> {
    const key = `cache:user:${id}`;
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const parsed: any = JSON.parse(cached);
        // Construct directly from cached JSON
        return new User(parsed.id, parsed.name, parsed.password || "");
      }
    } catch {}

    const user = await this.inner.getUserById(id);
    if (user) {
      try {
        // Ensure we store a stable JSON; prefer entity's toJSON if available
        const payload = (user as any).toJSON ? (user as any).toJSON() : { id: user.id, name: user.name, password: (user as any).password };
        await this.redis.set(key, JSON.stringify(payload), { EX: this.ttlSeconds });
      } catch {}
    }
    return user;
  }

  searchUsersByName(query: string, limit = 20): Promise<User[]> {
    return this.inner.searchUsersByName(query, limit);
  }
}
