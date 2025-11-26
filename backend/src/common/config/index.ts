import Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.valid('development', 'production', 'test').required(),
  PORT: Joi.number().port().required(),
  FRONTEND_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().required(),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URI: Joi.string().required(),
  ELASTICSEARCH_NODE: Joi.string().uri().required(),
  ELASTICSEARCH_USERNAME: Joi.string().optional().allow(''),
  ELASTICSEARCH_PASSWORD: Joi.string().optional().allow(''),
});
