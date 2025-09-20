import type { UserDTO } from "../user.dto";
import { User } from "../../entities/User";

export function mapUserToDTO(user: User): UserDTO {
  return {
    id: user.id,
    name: user.name,
  };
}
