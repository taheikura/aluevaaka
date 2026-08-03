/**
 * Lambda Function URL handler.
 *
 * Lambda Function URLs pass requests as LambdaFunctionURLEvent objects.
 * We do path routing here instead of relying on API Gateway, keeping
 * the MVP simple while making it trivial to move to API Gateway later —
 * just change the event type and update the route extraction.
 */
import type { Context, LambdaFunctionURLEvent } from 'aws-lambda';
import { handleHealth } from './handlers/health.js';
import { handleMap, handleRecommendations } from './handlers/recommendations.js';
import { clearRequestId, logger, setRequestId } from './logger.js';
import { error, type HandlerResponse, noContent } from './response.js';

export const handler = async (
  event: LambdaFunctionURLEvent,
  context: Context,
): Promise<HandlerResponse> => {
  setRequestId(context.awsRequestId);

  const method = event.requestContext.http.method.toUpperCase();
  const path = event.rawPath;
  const origin = event.headers.origin;

  logger.info('request_received', { method, path });

  try {
    // Preflight CORS — Lambda Function URLs need us to handle this ourselves
    if (method === 'OPTIONS') {
      return noContent(origin);
    }

    if (method === 'GET' && path === '/health') {
      return await handleHealth(origin);
    }

    if (method === 'POST' && path === '/recommendations') {
      const body = event.isBase64Encoded
        ? Buffer.from(event.body ?? '', 'base64').toString('utf-8')
        : (event.body ?? null);
      return await handleRecommendations(body, origin);
    }

    if (method === 'POST' && path === '/map') {
      const body = event.isBase64Encoded
        ? Buffer.from(event.body ?? '', 'base64').toString('utf-8')
        : (event.body ?? null);
      return await handleMap(body, origin);
    }

    return error(404, { error: 'Not found', code: 'VALIDATION_ERROR' }, origin);
  } catch (err) {
    logger.error('unhandled_error', { error: String(err) });
    return error(500, { error: 'Internal server error', code: 'INTERNAL_ERROR' }, origin);
  } finally {
    clearRequestId();
  }
};
