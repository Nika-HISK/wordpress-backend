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
import { YmlModule } from './yml/yml.module';
import { DockerModule } from './docker/docker.module';
import { HelperModule } from './helper/helper.module';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),


    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 1,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'Xalxtamdzleveli1',
      database: 'wordpress-backend',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    UserModule,
    SetupModule,
    WpcliModule,
    FilesModule,
    AwsModule,
    YmlModule,
    DockerModule,
    HelperModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
