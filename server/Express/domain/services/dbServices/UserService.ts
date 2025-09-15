import { User } from "../../entities/User";
import { IUserService } from "../../interfaces/dbInterfaces/Iservices/IUserService";

// TODO: replace 'any' with IUserRepo interface from domain/interfaces/dbInterfaces/Irepos
type UsersUowRunner = <T>(fn: (uow: { usersRepo: {
  addUser: (user: User) => Promise<User>;
  getUsers: () => Promise<User[]>;
  getUserById: (id: string) => Promise<User | undefined>;
  searchUsersByName: (query: string, limit: number) => Promise<User[]>;
} }) => Promise<T>) => Promise<T>;
type UsersUowProvider = { tx: UsersUowRunner; noTx: UsersUowRunner };
export class UserService implements IUserService {
  constructor(private readonly uow: UsersUowProvider) {}

  addUser(user: User): Promise<User> {
    return this.uow.noTx(async ({ usersRepo }) => usersRepo.addUser(user));
  }

  getUsers(): Promise<User[]> {
    return this.uow.noTx(async ({ usersRepo }) => usersRepo.getUsers());
  }

  getUserById(id: string): Promise<User | undefined> {
    return this.uow.noTx(async ({ usersRepo }) => usersRepo.getUserById(id));
  }

  searchUsersByName(query: string, limit = 20): Promise<User[]> {
    return this.uow.noTx(async ({ usersRepo }) => usersRepo.searchUsersByName(query, limit));
  }
}
