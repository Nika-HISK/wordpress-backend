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
        private readonly wpUserRepository:Repository<WpUser>    
    ){}


    async saveWpUsers(WpUsers: Array<object>, setupId) {
        const newWpUsers = WpUsers.map((user: any) => {
          const newWpUser = new WpUser();
          newWpUser.first_name = user['first_name'];
          newWpUser.last_name = user['last_name'];
          newWpUser.user_email = user['user_email'];
          newWpUser.roles = user['roles'];
          newWpUser.setup = setupId;
      
          return newWpUser;
        });
      
        await this.wpUserRepository.save(newWpUsers);
      }
      
      

}