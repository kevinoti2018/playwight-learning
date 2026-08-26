import { z } from 'zod'
import dotenv from 'dotenv';
import { maskSecrets } from './mask';
const rawEnv = process.env.TEST_ENV || 'qa'

dotenv.config({ path: `.env.${rawEnv}` })
const envSchema = z.object({
  BASE_URL: z.string().nonempty(),
  TEST_USER: z.string().nonempty(),
  TEST_PWD: z.string().nonempty(),
  TEST_ENV:z.enum(['qa','staging']).default('qa')
})

export const ENV = envSchema.parse(process.env)
// Never console.log(ENV) directly anywhere in the codebase — always route
// through maskSecrets first. This one debug line is the safe way to
// confirm config loaded correctly without a raw password hitting stdout.
if (process.env.DEBUG_ENV) {
  console.log('Loaded config:', maskSecrets(ENV));
}
