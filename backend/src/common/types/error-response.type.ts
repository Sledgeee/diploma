import { ErrorCodes, HttpCodes } from '../enums';

export type ErrorResponse = {
  success: false;
  code: ErrorCodes;
  statusCode: HttpCodes;
  message?: string;
  errors: any[];
  path: string;
  timestamp: Date;
};
