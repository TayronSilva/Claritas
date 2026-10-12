import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  institutionId: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    return data && user ? user[data] : user;
  },
);

export class JwtAuthGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
