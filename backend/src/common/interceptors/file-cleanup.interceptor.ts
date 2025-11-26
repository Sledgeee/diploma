import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { rm } from 'fs/promises';
import { catchError, Observable } from 'rxjs';

@Injectable()
export class FileCleanupInterceptor implements NestInterceptor {
  intercept(
    ctx: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const req = ctx.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      catchError(async (err) => {
        if (req.file) {
          await rm(req.file.path, { force: true });
        }

        throw err;
      }),
    );
  }
}
