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

@Module({
  imports: [TypeOrmModule.forFeature([Setup, User, wpPlugin, wpTheme, WpUser]), UserModule],
  controllers: [wpcliController],
  providers: [wpcliService, WpPluginRepository, WpThemeRepository, WpUserRepository],
})
export class WpcliModule {}
