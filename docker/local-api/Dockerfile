FROM node:22-alpine

WORKDIR /app
COPY docker/local-api/server.mjs ./server.mjs

ENV PORT=3000
ENV LAMBDA_URL=http://lambda:8080/2015-03-31/functions/function/invocations
EXPOSE 3000

CMD ["node", "server.mjs"]
