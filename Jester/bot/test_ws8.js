import fs from 'fs';
import WebSocket from 'ws';

const envFile = fs.readFileSync('.env', 'utf8');
const tokenLine = envFile.split('\n').find(line => line.startsWith('FLUXER_BOT_TOKEN='));
const token = tokenLine ? tokenLine.split('=')[1].trim() : null;
console.log('Token (last 6):', token?.slice(-6));

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
            } else if (msg.op === 7) {
                finish('RECONNECT_OP7');
            } else {
                finish('UNKNOWN_OP', msg.op);
            }
        });

        ws.on('close', (code) => finish('CLOSED', code));
        ws.on('error', (err) => finish('ERROR', err.message));
        setTimeout(() => finish('TIMEOUT'), 6000);
    });
}

async function run() {
    // Test 1: Full standard Discord Identify
    await connect('1: Standard Discord format', {
        token,
        properties: { $os: 'windows', $browser: 'fluxerjs', $device: 'fluxerjs' }
    });

    // Test 2: No properties at all
    await connect('2: No properties', { token });

    // Test 3: Empty properties
    await connect('3: Empty properties object', { token, properties: {} });

    // Test 4: Token without Bot prefix in payload
    await connect('4: "Bot " prefix in token', { token: `Bot ${token}`, properties: { os: 'windows' } });

    // Test 5: Minimal - token only
    await connect('5: Only token, os/browser/device props', {
        token,
        properties: { os: 'windows', browser: 'fluxerjs', device: 'fluxerjs' }
    });

    console.log(JSON.stringify(results, null, 2));
}

run();
