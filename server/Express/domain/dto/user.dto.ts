export interface UserDTO {
  id: string;
  name: string;
}

export interface CreateUserDTO {
  name: string;
  password: string;
}

export interface UpdateUserDTO {
  name?: string;
  password?: string;
}

export interface UserSearchQueryDTO {
  q: string;
  limit?: number;
}
