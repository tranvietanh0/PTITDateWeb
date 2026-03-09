import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type RequestWithUser = {
  userId?: string;
};

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.userId ?? '';
  },
);
