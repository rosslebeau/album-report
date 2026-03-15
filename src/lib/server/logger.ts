import pino from 'pino';
import { dev } from '$app/environment';

function createLogger(): pino.Logger {
	const options: pino.LoggerOptions = {
		level: process.env.LOG_LEVEL ?? (dev ? 'debug' : 'info'),
		formatters: {
			level(label) {
				return { level: label };
			}
		},
		timestamp: pino.stdTimeFunctions.isoTime
	};

	if (dev) {
		// In dev, write directly to stdout — no worker threads
		return pino(options);
	}

	// In production, use transports for stdout + rotating file
	const transports = pino.transport({
		targets: [
			{
				target: 'pino/file',
				options: { destination: 1 },
				level: 'debug'
			},
			{
				target: 'pino-roll',
				options: {
					file: 'logs/app.log',
					frequency: 'daily',
					mkdir: true,
					size: '10m'
				},
				level: 'info'
			}
		]
	});

	return pino(options, transports);
}

export const logger = createLogger();

export function createChildLogger(source: string) {
	return logger.child({ source });
}

export function withPerformanceLog<T>(
	log: pino.Logger,
	operation: string,
	fn: () => T
): T {
	const start = performance.now();
	const result = fn();
	if (result instanceof Promise) {
		return result.then((value) => {
			const duration = Math.round(performance.now() - start);
			log.info({ operation, durationMs: duration }, `${operation} completed`);
			return value;
		}) as T;
	}
	const duration = Math.round(performance.now() - start);
	log.info({ operation, durationMs: duration }, `${operation} completed`);
	return result;
}
