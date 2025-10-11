const { spawn } = require('child_process');
const path = require('path');

class ServerManager {
    constructor() {
        this.serverProcess = null;
        this.restartCount = 0;
        this.maxRestarts = 10;
        this.restartDelay = 2000; // 2 seconds
        this.isShuttingDown = false;
    }

    start() {
        console.log('🚀 Starting Facebook Auto Post Server...');
        this.runServer();
    }

    runServer() {
        if (this.isShuttingDown) return;

        const serverPath = path.join(__dirname, 'dist', 'app.js');
        console.log(`📁 Starting server from: ${serverPath}`);

        this.serverProcess = spawn('node', [serverPath], {
            stdio: 'inherit',
            env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' }
        });

        this.serverProcess.on('error', (error) => {
            console.error('❌ Server process error:', error);
            this.handleServerExit(1);
        });

        this.serverProcess.on('exit', (code, signal) => {
            console.log(`📊 Server exited with code: ${code}, signal: ${signal}`);
            this.handleServerExit(code);
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
    }

    handleServerExit(exitCode) {
        if (this.isShuttingDown) return;

        if (exitCode === 0) {
            console.log('✅ Server shut down gracefully');
            return;
        }

        this.restartCount++;
        console.log(`🔄 Restart attempt ${this.restartCount}/${this.maxRestarts}`);

        if (this.restartCount >= this.maxRestarts) {
            console.error('❌ Maximum restart attempts reached. Server will not restart automatically.');
            console.error('🔧 Please check the server logs and fix the underlying issue.');
            process.exit(1);
        }

        console.log(`⏳ Waiting ${this.restartDelay}ms before restart...`);
        setTimeout(() => {
            if (!this.isShuttingDown) {
                console.log('🔄 Restarting server...');
                this.runServer();
            }
        }, this.restartDelay);
    }

    shutdown() {
        console.log('🛑 Shutting down server manager...');
        this.isShuttingDown = true;

        if (this.serverProcess) {
            console.log('📤 Sending SIGTERM to server process...');
            this.serverProcess.kill('SIGTERM');

            // Force kill after 10 seconds if graceful shutdown fails
            setTimeout(() => {
                if (this.serverProcess && !this.serverProcess.killed) {
                    console.log('⚡ Force killing server process...');
                    this.serverProcess.kill('SIGKILL');
                }
            }, 10000);
        }

        process.exit(0);
    }
}

// Start the server manager
const manager = new ServerManager();
manager.start();
