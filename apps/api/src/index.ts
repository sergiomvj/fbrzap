import { buildApp } from "./app.js";
import "./config/env.js";

const port = 3333;
const host = "0.0.0.0";

const app = await buildApp();

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
