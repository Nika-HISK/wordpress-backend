import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshEntity } from './entities/refresh.entity';
import { User } from 'src/user/entities/user.entity';
import { Auth } from './entities/auth.entity';
import { RefreshRepository } from './repositories/refresh.repository';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { UserRepository } from 'src/user/repositories/user.repository'; 
import { Setup } from 'src/setup/entities/setup.entity';

@Module({
  imports: [
    UserModule, 
    PassportModule,
    JwtModule.register({global: true}),
    TypeOrmModule.forFeature([User, RefreshEntity, Auth, Setup]), 
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    ConfigService,
    JwtService,
    RefreshRepository,
    LocalAuthGuard,
    UserRepository, 
  ],
  exports:[AuthModule]
})
export class AuthModule {}
