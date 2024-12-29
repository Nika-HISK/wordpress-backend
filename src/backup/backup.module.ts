import { Module } from '@nestjs/common';
import { BackupService } from './services/backup.service';
import { BackupController } from './controllers/backup.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Backup } from './entities/backup.entity';
import { BackupRepository } from './repositories/backup.repository';
import { FilesService } from 'src/files/services/files.service';
import { KubernetesService } from 'src/setup/services/kubernetes.service';
import { FileEntity } from 'src/files/entities/file.entity';
import { Setup } from 'src/setup/entities/setup.entity';
import { SetupService } from 'src/setup/services/setup.service';
import { SetupRepository } from 'src/setup/repositories/setup.repository';
import { FilesRepository } from 'src/files/repositories/files.repository';
import { s3Service } from 'src/aws/services/s3.service';

@Module({
  imports:[TypeOrmModule.forFeature([Backup, FileEntity, Setup])],
  controllers: [BackupController],
  providers: [BackupService, BackupRepository, FilesService, KubernetesService, SetupService, SetupRepository, FilesRepository, s3Service],
})
export class BackupModule {}
