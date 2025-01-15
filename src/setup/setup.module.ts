import { forwardRef, Module} from '@nestjs/common';
import { SetupController } from './controllers/setup.controller';
import { SetupService } from './services/setup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setup } from './entities/setup.entity';
import { SetupRepository } from './repositories/setup.repository';
import { UserModule } from 'src/user/user.module'; 
import { wpPlugin } from 'src/wpcli/entities/wpPlugin.entity';
import { WpPluginRepository } from 'src/wpcli/repositories/wpPlugin.repository';
import { wpTheme } from 'src/wpcli/entities/wpTheme.entity';
import { WpUser } from 'src/wpcli/entities/wpUser.entity';
import { WpUserRepository } from 'src/wpcli/repositories/wpUser.repository';
import { KubernetesService } from './services/kubernetes.service';
import { Redirect } from './entities/redirect.entity';
import { RedirectRepository } from './repositories/redirect.repository';
import { BackupModule } from 'src/backup/backup.module';

@Module({
  imports: [forwardRef(() => BackupModule),
    TypeOrmModule.forFeature([Setup,wpPlugin, wpTheme, WpUser,Redirect]),
    forwardRef(() => UserModule),
    forwardRef(() => BackupModule)
  ],
  controllers: [SetupController],
  providers: [SetupService, SetupRepository, WpPluginRepository, WpUserRepository,KubernetesService,RedirectRepository],
  exports: [SetupRepository, SetupService,KubernetesService,RedirectRepository],
})
export class SetupModule {}
