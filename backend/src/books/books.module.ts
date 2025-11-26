import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        node: configService.get('ELASTICSEARCH_NODE', 'http://localhost:9200'),
        auth: configService.get('ELASTICSEARCH_USERNAME')
          ? {
              username: configService.get('ELASTICSEARCH_USERNAME'),
              password: configService.get('ELASTICSEARCH_PASSWORD'),
            }
          : undefined,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [BooksService],
  controllers: [BooksController],
  exports: [BooksService],
})
export class BooksModule {}
