import { Module } from '@nestjs/common';
import { FilesService } from './services/files.service';
import { FilesController } from './controllers/files.controller';
import { FilesRepository } from './repositories/files.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { s3Service } from 'src/aws/services/s3.service';
import { Auth } from 'src/auth/entities/auth.entity';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports:[
      TypeOrmModule.forFeature([FileEntity]),
      UserModule,
      AuthModule,
  ],
  controllers: [FilesController],
  providers: [FilesService, FilesRepository, s3Service],
})
export class FilesModule {}
