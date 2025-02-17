import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "src/auth/services/auth.service";
import { User } from "src/user/entities/user.entity";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email', 
      passwordField: 'password', 
    });
  }

  // async validate(email:string, password:string) {
  //   return this.authService.(email, password)
  // }

  }

