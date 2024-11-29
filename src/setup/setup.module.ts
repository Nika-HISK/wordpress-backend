import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([Setup,wpPlugin, wpTheme, WpUser]),
    UserModule,
  ],
  controllers: [SetupController],
  providers: [SetupService, SetupRepository, WpPluginRepository, WpUserRepository],
  exports: [SetupRepository, SetupService],
})
export class SetupModule {}
