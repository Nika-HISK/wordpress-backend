import { forwardRef, Module } from '@nestjs/common';
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
import { wpcliService } from 'src/wpcli/services/wpcli.service';
import { WpPluginRepository } from 'src/wpcli/repositories/wpPlugin.repository';
import { WpThemeRepository } from 'src/wpcli/repositories/wpTheme.repository';
import { WpUserRepository } from 'src/wpcli/repositories/wpUser.repository';
import { wpPlugin } from 'src/wpcli/entities/wpPlugin.entity';
import { wpTheme } from 'src/wpcli/entities/wpTheme.entity';
import { WpUser } from 'src/wpcli/entities/wpUser.entity';
import { SetupModule } from 'src/setup/setup.module';
import { RedirectRepository } from 'src/setup/repositories/redirect.repository';
import { Redirect } from 'src/setup/entities/redirect.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Backup, FileEntity, Setup, wpPlugin, wpTheme, WpUser, Redirect]),forwardRef(() => SetupModule)],
  controllers: [BackupController],
  providers: [BackupService, BackupRepository, FilesService, KubernetesService, SetupService, SetupRepository, FilesRepository, s3Service, wpcliService, WpPluginRepository, WpThemeRepository, WpUserRepository, RedirectRepository],
})
export class BackupModule {}
