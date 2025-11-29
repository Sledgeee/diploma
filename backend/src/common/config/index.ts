import Joi from 'joi';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

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

export const multerConfig: MulterOptions = {
  storage: diskStorage({
    destination: join(process.cwd(), 'uploads', 'book-covers'),
    filename: (req, file, callback) => {
      const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  }),
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
      return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};
