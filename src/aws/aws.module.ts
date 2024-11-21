import { Module } from '@nestjs/common';
import { s3Service } from './services/s3.service';

@Module({
    providers:[s3Service],
    exports:[s3Service]
})
export class AwsModule {}
