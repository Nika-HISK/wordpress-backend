import { Module } from '@nestjs/common';
import { wpcliController } from './controllers/wpcli.controller';
import { wpcliService } from './services/wpcli.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setup } from 'src/setup/entities/setup.entity';
import { User } from 'src/user/entities/user.entity';
import { UserModule } from 'src/user/user.module';
import { WpPluginRepository } from './repositories/wpPlugin.repository';
import { wpPlugin } from './entities/wpPlugin.entity';
import { wpTheme } from './entities/wpTheme.entity';
import { WpThemeRepository } from './repositories/wpTheme.repository';
import { WpUser } from './entities/wpUser.entity';
import { WpUserRepository } from './repositories/wpUser.repository';
import { SetupService } from 'src/setup/services/setup.service';
import { SetupModule } from 'src/setup/setup.module';
import { SetupRepository } from 'src/setup/repositories/setup.repository';
import { KubernetesService } from 'src/setup/services/kubernetes.service';
import { Redirect } from 'src/setup/entities/redirect.entity';
import { RedirectRepository } from 'src/setup/repositories/redirect.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Setup, User, wpPlugin, wpTheme, WpUser, Redirect]), UserModule],
  controllers: [wpcliController],
  providers: [wpcliService, WpPluginRepository, WpThemeRepository, WpUserRepository, SetupService, SetupRepository, KubernetesService, RedirectRepository],
})
export class WpcliModule {}
