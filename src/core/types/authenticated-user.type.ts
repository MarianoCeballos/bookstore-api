import { UserRole } from 'src/core/enums/user-role.enum';

export type AuthenticatedUser = {
  ID: number;
  email: string;
  role: UserRole;
};
