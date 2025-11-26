import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseBigIntPipe implements PipeTransform {
  transform(value: any): bigint {
    return BigInt(value);
  }
}
