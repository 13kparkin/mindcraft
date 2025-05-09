import { spawn } from 'child_process';
import { mainProxy } from './main_proxy.js';

export class AgentProcess {
    start(profile, load_memory=false, init_message=null, count_id=0, task_path=null, task_id=null) {
        // Validate profile parameter
        let profilePath;
        
        if (typeof profile === 'string') {
            profilePath = profile;
        } else if (profile && typeof profile === 'object' && profile.profileContent) {
            // This is a temporary compatibility measure
            // In the future, BotFactory should be updated to pass profilePath directly
            console.warn('Deprecated: Passing profile as object. Update caller to pass profile path string.');
            profilePath = profile.profileContent;
        } else {
            throw new TypeError('Profile must be a string filepath or an object with profileContent property');
        }
        
        this.profile = profilePath;
        this.count_id = count_id;
        this.running = true;

        let args = ['src/process/init_agent.js', this.name];
        args.push('-p', profilePath);
        args.push('-c', count_id);
        if (load_memory)
            args.push('-l', load_memory);
        if (init_message)
            args.push('-m', init_message);
        if (task_path)
            args.push('-t', task_path);
        if (task_id)
            args.push('-i', task_id);

        const agentProcess = spawn('node', args, {
            stdio: 'inherit',
            stderr: 'inherit',
        });
        
        let last_restart = Date.now();
        agentProcess.on('exit', (code, signal) => {
            console.log(`Agent process exited with code ${code} and signal ${signal}`);
            this.running = false;
            mainProxy.logoutAgent(this.name);
            
            if (code > 1) {
                console.log(`Ending task`);
                process.exit(code);
            }

            if (code !== 0 && signal !== 'SIGINT') {
                // agent must run for at least 10 seconds before restarting
                if (Date.now() - last_restart < 10000) {
                    console.error(`Agent process ${profilePath} exited too quickly and will not be restarted.`);
                    return;
                }
                console.log('Restarting agent...');
                this.start(profilePath, true, 'Agent process restarted.', count_id, task_path, task_id);
                last_restart = Date.now();
            }
        });
    
        agentProcess.on('error', (err) => {
            console.error('Agent process error:', err);
        });

        this.process = agentProcess;
    }

    stop() {
        if (!this.running) return;
        this.process.kill('SIGINT');
    }

    continue() {
        if (!this.running) {
            this.start(this.profile, true, 'Agent process restarted.', this.count_id);
        }
    }
}
