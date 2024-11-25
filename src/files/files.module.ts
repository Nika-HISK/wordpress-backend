import { Module } from '@nestjs/common';
import { FilesService } from './services/files.service';
import { FilesController } from './controllers/files.controller';
import { FilesRepository } from './repositories/files.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { s3Service } from 'src/aws/services/s3.service';

@Module({
    imports:[
      TypeOrmModule.forFeature([FileEntity])],
  controllers: [FilesController],
  providers: [FilesService, FilesRepository, s3Service],
})
export class FilesModule {}
