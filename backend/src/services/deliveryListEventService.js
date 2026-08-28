const clients = new Set();
let sequence = 0;

function subscribe(req, res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.write(': connected\n\n');

  const client = { res };
  clients.add(client);
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keep-alive\n\n');
      res.flush?.();
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
}

function publish(change = {}) {
  sequence += 1;
  const payload = JSON.stringify({
    event_id: sequence,
    occurred_at: new Date().toISOString(),
    ...change
  });
  const message = `id: ${sequence}\nevent: delivery-list-changed\ndata: ${payload}\n\n`;
  clients.forEach((client) => {
    if (client.res.writableEnded) clients.delete(client);
    else {
      client.res.write(message);
      client.res.flush?.();
    }
  });
}

module.exports = { subscribe, publish };
