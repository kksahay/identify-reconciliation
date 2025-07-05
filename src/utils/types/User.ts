export class User {
  email?: string;
  phoneNumber?: number;

  constructor(data?: Partial<User>) {
    Object.assign(this, data);
  }
}
