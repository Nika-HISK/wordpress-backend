import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/services/user.service';
import * as bcrypt from 'bcrypt'
import { Jwtconstantcs } from '../secret';
import { RefreshRepository } from '../repositories/refresh.repository';


@Injectable()
export class AuthService {
  constructor(
    private readonly refreshRepository:RefreshRepository,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email } = createUserDto;

    const existingUser = await this.userService.findOneByEmail(email);
    if (existingUser) {
      throw new HttpException('Email already in use', HttpStatus.BAD_REQUEST);
    }

    return this.userService.create(createUserDto);
  }



  async login(createUserDto: CreateUserDto) {
    console.log('baro');

    const { email, password } = createUserDto;

    const user = await this.userService.findOneByEmail(email);
    const isPasswordCorrect = user && (await bcrypt.compare(password, user.password));

    if (!isPasswordCorrect) {
      throw new HttpException('The email or password you entered is incorrect', HttpStatus.BAD_REQUEST);
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXP, 
    });

    

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXP, 
    });

     await this.refreshRepository.createAndSaveRefreshToken(payload.sub, refreshToken)

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.userService.findOne(payload.sub);

      const newAccessToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email, role: user.role },
        { secret: process.env.JWT_SECRET, expiresIn: process.env.JWT_ACCESS_EXP},
      );

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }
}
