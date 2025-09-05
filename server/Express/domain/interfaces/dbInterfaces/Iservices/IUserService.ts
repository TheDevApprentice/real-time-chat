import { User } from "../../../entities/User";

export interface IUserService {
  addUser(user: User): Promise<User>;
  getUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | undefined>;
  searchUsersByName(query: string, limit?: number): Promise<User[]>;
}