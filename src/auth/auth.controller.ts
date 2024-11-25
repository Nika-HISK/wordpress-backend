import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { Public } from './guard/jwt.strategy';
import { Roles } from './guard/jwt-roles.guard';
import { Role } from './guard/enum/role.enum';
import { AuthGuard } from './guard/jwt-auth.guard';

@UseGuards(AuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }
  
  @Roles(Role.USER, Role.ADMIN)
  @Public()
  @Post('login')
  async login(@Body() createUserDto: CreateUserDto) {
    return this.authService.login(createUserDto);
  }

  @Roles(Role.ADMIN)
  @Public()
  @Post('login/admin')
  async loginAdmin(@Body() createUserDto: CreateUserDto) {
    return this.authService.loginAdmin(createUserDto);
  }
}
