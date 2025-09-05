import { User } from "../../entities/User";
import { IUserService } from "../../interfaces/dbInterfaces/Iservices/IUserService";
import { IUserRepo } from "../../interfaces/dbInterfaces/Irepos/IUserRepo";
import { UsersRepo } from "../../../infrastructure/db/repos/UsersRepo";

// TODO: replace 'any' with IUserRepo interface from domain/interfaces/dbInterfaces/Irepos
export class UserService implements IUserService {
  private readonly userRepo: UsersRepo;

  constructor(private readonly _iUserRepo: IUserRepo) {
    this.userRepo = _iUserRepo as UsersRepo;
  }

  addUser(user: User): Promise<User> {
    return this.userRepo.addUser(user);
  }

  getUsers(): Promise<User[]> {
    return this.userRepo.getUsers();
  }

  getUserById(id: string): Promise<User | undefined> {
    return this.userRepo.getUserById(id);
  }

  searchUsersByName(query: string, limit = 20): Promise<User[]> {
    return this.userRepo.searchUsersByName(query, limit);
  }
}
