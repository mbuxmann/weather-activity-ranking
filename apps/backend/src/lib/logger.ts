import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info"
});

export type AppLogger = {
  debug(context: Record<string, unknown>, message: string): void;
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
  error(context: Record<string, unknown>, message: string): void;
};
