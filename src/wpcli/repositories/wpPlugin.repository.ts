import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { wpPlugin } from "../entities/wpPlugin.entity";
import { Repository } from "typeorm";

@Injectable()
export class WpPluginRepository {
    constructor(
        @InjectRepository(wpPlugin)
        private readonly WpPluginRepository: Repository<wpPlugin>
    ) {}

    async saveUserPlugins(plugins: Array<object>, setupId: number) {
        for (const plugin of plugins) {
            const existingPlugin = await this.WpPluginRepository.findOne({
                where: { name: plugin['name'], setupId: setupId },
            });

            if (existingPlugin) {
                existingPlugin.auto_update = plugin['auto_update'];
                existingPlugin.status = plugin['status'];
                existingPlugin.update = plugin['update'];
                existingPlugin.update_version = plugin['update_version'];
                existingPlugin.version = plugin['version'];
                await this.WpPluginRepository.save(existingPlugin);
            } else {
                const newPlugin = new wpPlugin();
                newPlugin.name = plugin['name'];
                newPlugin.auto_update = plugin['auto_update'];
                newPlugin.status = plugin['status'];
                newPlugin.update = plugin['update'];
                newPlugin.update_version = plugin['update_version'];
                newPlugin.version = plugin['version'];
                newPlugin.setupId = setupId;
                await this.WpPluginRepository.save(newPlugin);
            }
        }
    }


    async deletePlugins(name: string): Promise<void> {
      await this.WpPluginRepository.delete({ name });
    }

    async updatePlugins(name:string) {
      
    }

}
