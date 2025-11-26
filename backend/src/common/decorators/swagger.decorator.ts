import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export const SwaggerOperation = (
  summary: string,
  isPrivate: boolean = true,
) => {
  const decorators = [ApiOperation({ summary })];

  if (isPrivate) {
    decorators.push(ApiBearerAuth());
  }

  return applyDecorators(...decorators);
};

export const SwaggerFormData = (model?: Type<any>) =>
  model
    ? applyDecorators(
        ApiConsumes('multipart/form-data'),
        ApiExtraModels(model),
        ApiBody({ schema: { $ref: getSchemaPath(model) } }),
      )
    : applyDecorators(ApiConsumes('multipart/form-data'));

export const SwaggerResponse = (status: number, model?: Type<any>) =>
  model
    ? applyDecorators(
        ApiExtraModels(model),
        ApiResponse({
          status,
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { $ref: getSchemaPath(model) },
            },
          },
        }),
      )
    : applyDecorators(
        ApiResponse({
          status,
          schema: {
            type: 'object',
            properties: { success: { type: 'boolean', example: true } },
          },
        }),
      );
