import http from 'node:http';

const port = Number(process.env.PORT ?? 3000);
const lambdaUrl =
  process.env.LAMBDA_URL ?? 'http://lambda:8080/2015-03-31/functions/function/invocations';

const routes = new Map([
  ['GET /health', '/health'],
  ['POST /recommendations', '/recommendations'],
  ['OPTIONS /recommendations', '/recommendations'],
]);

const server = http.createServer(async (request, response) => {
  const path = request.url?.split('?')[0] ?? '/';
  const route = routes.get(`${request.method} ${path}`);

  if (!route) {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  const event = {
    version: '2.0',
    routeKey: `${request.method} ${route}`,
    rawPath: route,
    rawQueryString: '',
    headers: request.headers,
    requestContext: {
      http: {
        method: request.method,
        path: route,
        protocol: 'HTTP/1.1',
        sourceIp: request.socket.remoteAddress ?? '127.0.0.1',
        userAgent: request.headers['user-agent'] ?? 'aluevaaka-local-api',
      },
    },
    body: body || undefined,
    isBase64Encoded: false,
  };

  try {
    const lambdaResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
    });
    const invocation = await lambdaResponse.json();
    const headers = invocation.headers ?? { 'content-type': 'application/json' };
    response.writeHead(invocation.statusCode ?? 502, headers);
    response.end(invocation.body ?? '');
  } catch (error) {
    console.error(error);
    response.writeHead(502, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'Local Lambda is unavailable' }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Local API gateway listening on port ${port}`);
});
