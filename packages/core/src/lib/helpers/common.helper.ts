import { Result, Option as ResultOption } from '@sapphire/result'
import { Snowflake as sf } from '@sapphire/snowflake'

export * from '@sapphire/pieces'
export { Result, ResultOption }

export const Snowflake = new sf(1668384000000n)
