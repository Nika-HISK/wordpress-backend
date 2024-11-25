import { Module } from '@nestjs/common';
import { wpcliController } from './controllers/wpcli.controller';
import { wpcliService } from './services/wpcli.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setup } from 'src/setup/entities/setup.entity';
import { User } from 'src/user/entities/user.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Setup, User]), UserModule],
  controllers: [wpcliController],
  providers: [wpcliService],
})
export class WpcliModule {}
