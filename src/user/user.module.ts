import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { SetupService } from 'src/setup/services/setup.service';
import { SetupModule } from 'src/setup/setup.module';



@Module({
  imports: [TypeOrmModule.forFeature([User]),forwardRef(() => SetupModule)],
  controllers: [UserController],
  providers: [UserService, UserRepository,SetupService,],  
  exports: [UserService, UserRepository],  
})
export class UserModule {}
