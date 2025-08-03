import type { Piece } from '@sapphire/pieces';
import type { Logger } from '@vegapunk/logger';

export interface ClientOptions {
  logger?: Logger;
  baseUserDirectory?: URL | string | null;
  internalError?: boolean;
  internalException?: boolean;
  internalRejection?: boolean;
}

export interface ClientEvents {
  internalError: [error: unknown, context: Piece];
  internalException: [error: Error, origin: string];
  internalRejection: [reason: unknown, promise: Promise<unknown>];
}
