import fs from 'fs';
import WebSocket from 'ws';

const token = '1473229591074357261.0zLFo3tZXZ9jTaxg5eaBcD-5dQV9CQq-EfpI0w3z10E';
const log = [];

function run() {
    return new Promise((resolve) => {
        const ws = new WebSocket('wss://gateway.fluxer.app/?v=1&encoding=json');

        const done = () => {
            fs.writeFileSync('verbose_ws_log.json', JSON.stringify(log, null, 2));
            ws.close();
            resolve();
        };

        ws.on('open', () => log.push('WebSocket connected'));

        ws.on('message', (data) => {
            const payload = JSON.parse(data);
            log.push({ received: payload });

            if (payload.op === 10) { // Hello
                const identify = {
                    op: 2,
                    d: {
                        token,
                        properties: { os: 'windows', browser: 'fluxerjs', device: 'fluxerjs' }
                    }
                };
                log.push({ sent: identify });
                ws.send(JSON.stringify(identify));
            }
        });

        ws.on('error', (err) => log.push({ error: err.message }));

        setTimeout(() => done(), 5000);
    });
}
run();
