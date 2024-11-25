import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { UserModule } from 'src/user/user.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guard/jwt-auth.guard';
import { jwtConfig } from 'src/config/config';
import { UserService } from 'src/user/services/user.service';
@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXP },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, 
      {
        provide: APP_GUARD,
        useClass: AuthGuard,
      },
    ],
  exports: [AuthService],
})
export class AuthModule {}
