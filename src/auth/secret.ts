import * as dotenv from "dotenv"

dotenv.config({path: '.env'})
export const Jwtconstantcs = {
    secret: process.env.JWT_SECRET
}