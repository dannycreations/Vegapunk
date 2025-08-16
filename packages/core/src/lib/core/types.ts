import type { Piece } from '@sapphire/pieces';
import type { Logger } from '@vegapunk/logger';

export interface ClientOptions {
  readonly logger?: Logger;
  readonly baseDirectory?: URL | string | null;
  readonly internalError?: boolean;
  readonly internalException?: boolean;
  readonly internalRejection?: boolean;
}

export interface ClientEvents {
  readonly internalError: [error: unknown, context: Piece];
  readonly internalException: [error: Error, origin: string];
  readonly internalRejection: [reason: unknown, promise: Promise<unknown>];
}
