import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { SetupModule } from './setup/setup.module';
import { WpcliModule } from './wpcli/wpcli.module';
import { FilesModule } from './files/files.module';
import { AwsModule } from './aws/aws.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [ThrottlerModule.forRoot([
    {
      name: 'short',
      ttl: 1000,
      limit: 1,
    },
    {
      name: 'medium',
      ttl: 10000,
      limit: 20
    },
    {
      name: 'long',
      ttl: 60000,
      limit: 100
    }
  ]),
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DATABASE_HOST,
      port: 3306,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities:true,
      synchronize: true,
    }),
    AuthModule,
    UserModule,
    SetupModule,
    WpcliModule,
    FilesModule,
    AwsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
