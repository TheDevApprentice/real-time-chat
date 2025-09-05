import { User } from "../../entities/User";
import { IUserService } from "../../interfaces/dbInterfaces/Iservices/IUserService";
import { IUserRepo } from "../../interfaces/dbInterfaces/Irepos/IUserRepo";

// TODO: replace 'any' with IUserRepo interface from domain/interfaces/dbInterfaces/Irepos
export class UserService implements IUserService {
  private readonly userRepo: IUserRepo;

  constructor(private readonly _iUserRepo: IUserRepo) {
    this.userRepo = _iUserRepo;
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
