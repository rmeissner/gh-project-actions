import "dotenv/config";
import { loadItems } from "./source";
import {
  groupBy,
  iterationMapper,
  renderSimple,
  statusMapper,
  teamMapper,
} from "./utils";

const execute = async () => {
  const runId = new Date().toISOString().slice(0, 10);
  const path = `graphs/${runId}/`;
  const data = await loadItems();
  await renderSimple(data, iterationMapper, teamMapper, {
    path,
    name: "total_complexity",
  });

  const groups = groupBy(data, iterationMapper);
  for (const entry in groups) {
    if (entry === "unknown") continue;
    const items = groups[entry];
    await renderSimple(items, teamMapper, statusMapper, {
      path,
      name: entry.toLowerCase().replace(" ", "_"),
      stacked: true,
    });
  }
};
execute();
