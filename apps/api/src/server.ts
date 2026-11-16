import mongoose from "mongoose";
import { app } from "./app.js";
import { validateEnvironment } from "./security.js";
validateEnvironment(process.env);
try {
  await mongoose.connect(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });
  await Promise.all(
    mongoose.modelNames().map((name) => mongoose.model(name).init()),
  );
} catch (error) {
  console.error(
    "No se pudo inicializar MongoDB:",
    error instanceof Error ? error.name : "Error",
  );
  await mongoose.disconnect();
  process.exit(1);
}
const server = app.listen(Number(process.env.PORT) || 4000, "0.0.0.0", () =>
  console.log("NEXORA API disponible"),
);
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(() => {
    void mongoose.disconnect().then(() => {
      clearTimeout(timeout);
      process.exit(0);
    });
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
