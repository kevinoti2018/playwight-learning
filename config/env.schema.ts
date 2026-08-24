import { z } from 'zod'
import dotenv from 'dotenv';
const rawEnv = process.env.TEST_ENV || 'staging'
dotenv.config({ path: `.env.${rawEnv}` })
const envSchema = z.object({
  BASE_URL: z.string().nonempty(),
  TEST_USER: z.string().nonempty(),
  TEST_PWD: z.string().nonempty(),
  TEST_ENV:z.enum(['qa','staging']).default('qa')
})

export const ENV = envSchema.parse(process.env)
