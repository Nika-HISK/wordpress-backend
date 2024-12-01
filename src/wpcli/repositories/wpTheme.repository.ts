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


    async saveUserThemes(themes: Array<object>, setupId: number) {
      for (const theme of themes) {
          const existingTheme = await this.WpThemeRepository.findOne({
              where: { name: theme['name'], setupId: setupId },
          });

          if (existingTheme) {
              existingTheme.auto_update = theme['auto_update'];
              existingTheme.status = theme['status'];
              existingTheme.update = theme['update'];
              existingTheme.update_version = theme['update_version'];
              existingTheme.version = theme['version'];
              await this.WpThemeRepository.save(existingTheme);
          } else {
              const newTheme = new wpTheme();
              newTheme.name = theme['name'];
              newTheme.auto_update = theme['auto_update'];
              newTheme.status = theme['status'];
              newTheme.update = theme['update'];
              newTheme.update_version = theme['update_version'];
              newTheme.version = theme['version'];
              newTheme.setupId = setupId;
              await this.WpThemeRepository.save(newTheme);
          }
      }
  }

      

  async deleteThemes(name:string) {
    return await this.WpThemeRepository.delete({name})
  }

}