import fs from 'fs';
import WebSocket from 'ws';

const envFile = fs.readFileSync('.env', 'utf8');
const token = envFile.split('\n').find(l => l.startsWith('FLUXER_BOT_TOKEN=')).split('=')[1].trim();

const results = [];

function connect(name, payloadD) {
    return new Promise((resolve) => {
        const ws = new WebSocket('wss://gateway.fluxer.app/?v=1&encoding=json');
        let done = false;

        const finish = (status, extra) => {
            if (done) return;
            done = true;
            results.push({ name, status, extra });
            ws.close();
            resolve();
        };

        ws.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.op === 10) {
                ws.send(JSON.stringify({ op: 2, d: payloadD }));
            } else if (msg.op === 9) {
                finish('INVALID_SESSION', msg.d);
            } else if (msg.t === 'READY') {
                finish('READY', msg.d?.user?.username);
            } else {
                // don't finish — keep waiting for READY or Invalid Session
            }
        });

        ws.on('close', (code) => finish('CLOSED', code));
        ws.on('error', (err) => finish('ERROR', err.message));
        setTimeout(() => finish('TIMEOUT'), 5000);
    });
}

async function run() {
    await connect('A: shard [0,1]', {
        token,
        properties: { os: 'windows', browser: 'fluxerjs', device: 'fluxerjs' },
        shard: [0, 1]
    });

    await connect('B: large_threshold', {
        token,
        properties: { os: 'windows', browser: 'fluxerjs', device: 'fluxerjs' },
        large_threshold: 50
    });

    await connect('C: compress flag', {
        token,
        compress: false,
        properties: { os: 'windows', browser: 'fluxerjs', device: 'fluxerjs' }
    });

    await connect('D: all fields', {
        token,
        compress: false,
        large_threshold: 50,
        shard: [0, 1],
        properties: { os: 'windows', browser: 'fluxerjs', device: 'fluxerjs' }
    });

    console.log(JSON.stringify(results, null, 2));
}

run();
