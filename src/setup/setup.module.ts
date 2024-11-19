import { Module } from '@nestjs/common';
import { SetupController } from './controllers/setup.controller';
import { SetupService } from './services/setup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setup } from './entities/setup.entity';
import { SetupRepository } from './repositories/setup.repository';
import { UserModule } from 'src/user/user.module'; 
import { AuthModule } from 'src/auth/auth.module'; 


@Module({
  imports: [
    TypeOrmModule.forFeature([Setup]),
    UserModule,
    AuthModule, 
  ],
  controllers: [SetupController],
  providers: [SetupService, SetupRepository],
  exports: [SetupRepository, SetupService],
})
export class SetupModule {}
