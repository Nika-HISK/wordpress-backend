import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { wpPlugin } from "../entities/wpPlugin.entity";
import { Repository } from "typeorm";
import { wpTheme } from "../entities/wpTheme.entity";
import { WpUser } from "../entities/wpUser.entity";



@Injectable()
export class WpUserRepository {
    constructor(
        @InjectRepository(WpUser)
        private readonly wpUserRepository: Repository<WpUser>
    ) {}

    async saveWpUsers(WpUsers: Array<object>, setupId: number) {
        for (const user of WpUsers) {
            const existingUser = await this.wpUserRepository.findOne({
                where: { user_email: user['user_email'], setupId: setupId },
            });

            if (existingUser) {
                existingUser.first_name = user['first_name'];
                existingUser.last_name = user['last_name'];
                existingUser.roles = user['roles'];
                await this.wpUserRepository.save(existingUser);
            } else {
                const newWpUser = new WpUser();
                newWpUser.first_name = user['first_name'];
                newWpUser.last_name = user['last_name'];
                newWpUser.user_email = user['user_email'];
                newWpUser.roles = user['roles'];
                newWpUser.setupId = setupId;
                await this.wpUserRepository.save(newWpUser);
            }
        }
    }

    async deleteWpUsers(id:number): Promise<void> {
        await this.wpUserRepository.delete(id);
    }
}
