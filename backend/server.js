import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import ingestRouter from "./routes/ingest.js";
import queryRouter from "./routes/query.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api/ingest", ingestRouter);
app.use("/api/query", queryRouter);

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
