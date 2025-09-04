export class User {
  private _id: string;
  private _name: string;
  private _password: string;

  constructor(id: string, name: string, password: string) {
    this._id = id;
    this._name = name;
    this._password = password || ''; 
  }

  get id(): string {
    return this._id;
  }

  set id(value: string) {
    this._id = value;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  toJSON(): { id: string; name: string } {
    return { id: this._id, name: this._name };
  }

  get password(): string {
    return this._password;
  }

  set password(value: string) {
    this._password = value;
  }

  // Factory for DB rows
  static fromDbRow(row: { id: string; name: string; password?: string }): User | undefined {
    if (!row) return undefined;
    return new User(row.id, row.name, row.password || '');
  }
}
