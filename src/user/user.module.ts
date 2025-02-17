import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { SetupService } from 'src/setup/services/setup.service';
import { SetupModule } from 'src/setup/setup.module';
import { AuthService } from 'src/auth/services/auth.service';
import { RefreshRepository } from 'src/auth/repositories/refresh.repository';
import { RefreshEntity } from 'src/auth/entities/refresh.entity';



@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshEntity]),forwardRef(() => SetupModule)],
  controllers: [UserController],
  providers: [UserService, UserRepository,SetupService, AuthService, RefreshRepository],  
  exports: [UserService, UserRepository],  
})
export class UserModule {}
