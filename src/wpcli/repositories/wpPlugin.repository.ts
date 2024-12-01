import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { wpPlugin } from "../entities/wpPlugin.entity";
import { Repository } from "typeorm";




@Injectable()
export class WpPluginRepository {
    constructor(
        @InjectRepository(wpPlugin)
        private readonly WpPluginRepository:Repository<wpPlugin>    
    ){}


    async saveUserPlugins(plugins: Array<object>, setupId) {
        const newPlugins = plugins.map((plugin) => {
          const newPlugin = new wpPlugin();
          newPlugin.name = plugin['name'];
          newPlugin.auto_update = plugin['auto_update'];
          newPlugin.status = plugin['status'];
          newPlugin.update = plugin['update'];
          newPlugin.update_version = plugin['update_version'];
          newPlugin.version = plugin['version'];
          newPlugin.setup = setupId

          return newPlugin;
        });
    
        return await this.WpPluginRepository.save(newPlugins);
      }

}