import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpCodes } from '../enums';

@Catch(HttpException)
export class NestHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(NestHttpExceptionFilter.name);
  private readonly httpCodesToIgnoreLogging = [
    HttpCodes.Unauthorized,
    HttpCodes.Forbidden,
    HttpCodes.NotFound,
    HttpCodes.TooManyRequests,
  ];

  catch(err: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const statusCode = err.getStatus() || HttpCodes.InternalServerError;
    if (!this.httpCodesToIgnoreLogging.includes(statusCode)) {
      this.logger.error(err);
    }

    res.status(statusCode).json({
      success: false,
      code: 0,
      statusCode,
      message: err?.message,
      errors: [],
      path: req.path,
      timestamp: new Date(),
    });
  }
}
