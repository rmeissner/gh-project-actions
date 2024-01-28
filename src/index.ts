import "dotenv/config";
import { loadItems, loadIterations, loadStati, loadTeams } from "./source";
import {
  asDate,
  complexityGroup,
  groupBy,
  iterationMapper,
  readJsonFile,
  renderSimple,
  staticLabels,
  statusMapper,
  stringLabels,
  teamMapper,
  writeFile,
} from "./utils";
import { buildDatasets } from "./render";
import { updateBurnDown } from "./burn";

const execute = async () => {
  const now = new Date();
  const runId = now.toISOString().slice(0, 10);
  const data = await loadItems();
  await renderSimple(data, iterationMapper, teamMapper, {
    path: "stats/total_complexity/",
    name: runId,
  });

  const teams = await loadTeams();
  const stati = await loadStati();
  const openIterations = await loadIterations(true);
  const itemsPerIteration = groupBy(data, iterationMapper);
  for (const iteration of openIterations) {
    const iterationItems = itemsPerIteration[iteration.title];
    if (!iterationItems) continue;
    const name = iteration.title.toLowerCase().replace(" ", "_");
    const startDate = asDate(iteration.startDate);
    const endDate = asDate(iteration.startDate, iteration.duration + 1);
    if (startDate > now || endDate < now) continue;
    // Render Status per Team per Day graph
    await renderSimple(iterationItems, teamMapper, statusMapper, {
      path: `stats/${name}/status_per_team/`,
      name: runId,
      stacked: true,
    });
    // Create Core Status distribution for Core Burn Down Chart
    const coreBurn = await buildDatasets(
      iterationItems,
      stringLabels([runId]),
      staticLabels(stati),
      complexityGroup(undefined, statusMapper)
    );

    updateBurnDown(runId, stati, iteration, "core", coreBurn.datasets);

    for (const team of teams) {
      // Create Team Status distribution for Team Burn Down Chart
      const iterationItemsPerTeam = groupBy(iterationItems, teamMapper);
      const teamIterationItems = iterationItemsPerTeam[team.value];
      if (!teamIterationItems) continue;
      const teamBurn = await buildDatasets(
        teamIterationItems,
        stringLabels([runId]),
        staticLabels(stati),
        complexityGroup(undefined, statusMapper)
      );
      updateBurnDown(
        runId,
        stati,
        iteration,
        team.value.toLowerCase(),
        teamBurn.datasets
      );
    }
  }
};
execute();
