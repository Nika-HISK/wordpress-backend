import { JwtConfigInterface } from "./interfaces/jwt-config.interface";

export const jwtConfig: JwtConfigInterface = {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXP
} 