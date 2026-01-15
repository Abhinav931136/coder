import serverless from "serverless-http";
import "express"; // ensure bundler includes express types
import { createServer } from "../../server/index.ts";

export const handler = serverless(createServer());
