import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.currentPassword',
      'req.body.newPassword',
      'req.body.token',
      'password',
      'token',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
  base: { service: 't-world-api' },
});
