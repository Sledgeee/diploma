import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorCodes, HttpCodes } from '../enums';
import { HttpException } from '../exceptions';
import { ErrorResponse } from '../types';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
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

    const statusCode = err.statusCode || HttpCodes.InternalServerError;
    if (
      err.code !== ErrorCodes.Validation &&
      !this.httpCodesToIgnoreLogging.includes(err.statusCode)
    ) {
      this.logger.error(err);
    }

    const data: ErrorResponse = {
      success: false,
      code: err?.code,
      statusCode,
      message: err?.message,
      errors: err?.errors || [],
      path: req.path,
      timestamp: new Date(),
    };

    res.status(statusCode).json(data);
  }
}
