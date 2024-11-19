import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/services/user.service';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshEntity } from './entities/refresh.entity';
import { User } from 'src/user/entities/user.entity';
import { Auth } from './entities/auth.entity';
import { RefreshRepository } from './repositories/refresh.repository';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { UserRepository } from 'src/user/repositories/user.repository'; 

@Module({
  imports: [
    UserModule, 
    PassportModule,
    JwtModule.register({global: true}),
    TypeOrmModule.forFeature([User, RefreshEntity, Auth]), 
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
})
export class AuthModule {}
