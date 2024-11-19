import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    ForbiddenException,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { JwtService } from '@nestjs/jwt';
  import { Request } from 'express';
import { UserRepository } from 'src/user/repositories/user.repository';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from './roles.guard';
import { Role } from '../enum/role.enum';
  
  @Injectable()
  export class LocalAuthGuard implements CanActivate {
    constructor(
      private readonly userRepository: UserRepository,
      private jwtService: JwtService,
      private reflector: Reflector,
    ) {}
  
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);
        if (isPublic) {
          return true;
        }
      
        const request = context.switchToHttp().getRequest<Request>();
        const token = request.cookies['accessToken'];

        // console.log(request.cookies)
      
        if (!token) {
          console.log('No token found');
          throw new UnauthorizedException('Access token is missing.');
        }
      
        try {
          const payload = await this.jwtService.verifyAsync(token, {
            secret: process.env.JWT_SECRET
          });

        //   console.log('payloa')
      
          const user = await this.userRepository.findOne(payload.sub);
          request.user = user;
          

        //   console.log(user)
      
          const requiredRoles = this.getRequiredRoles(context);
        //   console.log(requiredRoles)
          if (requiredRoles.length) {
            return requiredRoles.some((role) => payload.role === role);
          }
      
          return true;
        } catch (err) {
          console.log('Token verification failed');
          throw new ForbiddenException('Invalid token.');
        }
      }
      
  
    private getRequiredRoles(context: ExecutionContext): Role[] {
      return this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    }
  }
  