import fs from 'fs';
import WebSocket from 'ws';

const envFile = fs.readFileSync('.env', 'utf8');
const tokenLine = envFile.split('\n').find(line => line.startsWith('FLUXER_BOT_TOKEN='));
const token = tokenLine ? tokenLine.split('=')[1].trim() : null;

const log = [];

function connect(testName, payloadD) {
    return new Promise((resolve) => {
        const ws = new WebSocket('wss://gateway.fluxer.app/?v=1&encoding=json');
        let finished = false;

        const done = (status) => {
            if (finished) return;
            finished = true;
            fs.writeFileSync('test_ws_events.json', JSON.stringify(log, null, 2));
            ws.close();
            resolve();
        };

        ws.on('message', (data) => {
            const payload = JSON.parse(data);
            log.push({ rx: payload });
            if (payload.op === 10) {
                ws.send(JSON.stringify({ op: 2, d: payloadD }));
            } else if (payload.op === 9) {
                done('Invalid Session');
            } else if (payload.t === 'READY') {
                done('READY');
            }
        });

        ws.on('error', (err) => done('Error: ' + err.message));
        setTimeout(() => done('Timeout'), 8000);
    });
}

async function run() {
    await connect('Test: Modded properties', {
        token,
        properties: { $os: 'linux', $browser: 'fluxerjs', $device: 'fluxerjs' }
    });
}

run();
