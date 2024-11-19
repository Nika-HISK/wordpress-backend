import { Controller, Post, Body, Res, Req, HttpCode, HttpStatus, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from '../services/auth.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { Public } from '../decorators/public.decorator';
import { Role } from '../enum/role.enum';
import { Roles } from '../guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}



@UseGuards(LocalAuthGuard)
@Public()
@Post('login')
async login(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
  const { accessToken, refreshToken } = await this.authService.login(createUserDto);

  res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, maxAge: 15 * 60 * 1000 }); 
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); 

  return res.send({
    message: 'Login successful',
    accessToken,
    refreshToken,
  });
}

  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing.');
    }

    const { accessToken } = await this.authService.refresh(refreshToken);

    res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, maxAge: 15 * 60 * 1000 });

    return res.send({ message: 'Token refreshed' });
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res() res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.send({ message: 'Logged out successfully' });
  }


  @Public()
  @Post('register')
  async register(@Body() createUserDto:CreateUserDto) {
    return await this.authService.register(createUserDto)
  }

}
