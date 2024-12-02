import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';


const execAsync = promisify(exec);


@Injectable()
export class DockerService {

    async start(instanceId:string, instanceDir:string) {
        const isWindows = process.platform === 'win32';
        const dockerCommand = isWindows
          ? 'docker-compose up -d'
          : 'docker compose up -d';
  
        await execAsync(dockerCommand, { cwd: instanceDir });
        console.log(`Docker services started for instance ${instanceId}.`);
    }

}
