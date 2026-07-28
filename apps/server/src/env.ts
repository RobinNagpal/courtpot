import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().int().positive().default(7071),
});

export const env = Env.parse(process.env);
