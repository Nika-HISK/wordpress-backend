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
import { SetupService } from 'src/setup/services/setup.service';
import { SetupRepository } from 'src/setup/repositories/setup.repository';
import { KubernetesService } from 'src/setup/services/kubernetes.service';
import { RedirectRepository } from 'src/setup/repositories/redirect.repository';
import { Redirect } from 'src/setup/entities/redirect.entity';

@Module({
  imports: [
    UserModule, 
    PassportModule,
    JwtModule.register({global: true}),
    TypeOrmModule.forFeature([User, RefreshEntity, Auth, Setup, Redirect]), 
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
    SetupService,
    SetupRepository,
    KubernetesService,
    RedirectRepository
  ],
  exports:[AuthModule]
})
export class AuthModule {}
