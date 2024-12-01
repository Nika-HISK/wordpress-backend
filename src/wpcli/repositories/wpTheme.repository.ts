import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { wpPlugin } from "../entities/wpPlugin.entity";
import { Repository } from "typeorm";
import { wpTheme } from "../entities/wpTheme.entity";




@Injectable()
export class WpThemeRepository {
    constructor(
        @InjectRepository(wpTheme)
        private readonly WpThemeRepository:Repository<wpTheme>    
    ){}


    async saveUserThemes(themes: Array<object>, setupId) {
        const newThemes = themes.map((theme) => {
          const newTheme = new wpTheme();
          newTheme.name = theme['name'];
          newTheme.auto_update = theme['auto_update'];
          newTheme.status = theme['status'];
          newTheme.update = theme['update'];
          newTheme.update_version = theme['update_version'];
          newTheme.version = theme['version'];
          newTheme.setup = setupId;
      
          return newTheme;
        });
      
        return await this.WpThemeRepository.save(newThemes); 
      }
      

}