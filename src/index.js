import 'dotenv/config';
import { renderStats } from "./render.js";
import { loadStats } from "./source.js";

const execute = async () => {
  const data = await loadStats()
  await renderStats(data)
};
execute();
