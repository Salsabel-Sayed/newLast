import "dotenv/config";
import Joi from "joi";

interface Env {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;
  MONGODB_URI: string;
}

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().port().default(5000),
  MONGODB_URI: Joi.string()
    .uri({ scheme: ["mongodb", "mongodb+srv"] })
    .required(),
}).unknown(true);

const { value, error } = envSchema.validate(process.env) as {
  value: Env & Record<string, unknown>;
  error?: Joi.ValidationError;
};

if (error) {
  throw new Error(`Invalid environment configuration: ${error.message}`);
}

export const env: Env = {
  NODE_ENV: value.NODE_ENV,
  PORT: value.PORT,
  MONGODB_URI: value.MONGODB_URI,
};
