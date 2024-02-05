import "dotenv/config";
import {
  Iteration,
  loadItems,
  loadIterations,
  loadStati,
  loadTeams,
} from "./source";
import {
  asDate,
  clean,
  complexityGroup,
  groupBy,
  iterationMapper,
  labelReducer,
  renderSimple,
  staticLabels,
  statusMapper,
  stringLabels,
  teamMapper,
} from "./utils";
import { buildDatasets, dynamicRender } from "./render";
import { updateBurnDown } from "./burn";
import { MDWriter } from "./md";
import fs from "fs";

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
  const openIterations = await loadIterations();
  const itemsPerIteration = groupBy(data, iterationMapper);
  let currentIteration: Iteration = null;
  for (const iteration of openIterations) {
    const iterationItems = itemsPerIteration[iteration.title];
    if (!iterationItems) continue;
    const name = clean(iteration.title);
    const startDate = asDate(iteration.startDate);
    const endDate = asDate(iteration.startDate, iteration.duration + 1);
    if (startDate > now || endDate <= now) continue;
    currentIteration = iteration;
    // Render Status per Team per Day graph

    await dynamicRender(
      iterationItems,
      labelReducer(teamMapper),
      staticLabels(stati),
      complexityGroup(teamMapper, statusMapper),
      {
        path: `stats/${name}/status_per_team/`,
        name: runId,
        stacked: true,
      }
    );
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
      const teamIterationItems = iterationItemsPerTeam[team.value] ?? [];
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

    const mdWriter = new MDWriter();
    mdWriter
      ._("## Current Iteration:", currentIteration.title)
      ._("### Last Status", runId)
      .img(`./status_per_team/${runId}.png`, "Current Status")
      ._("### Core Burn Down Chart")
      .img(`./core_burn_down.png`, "Core Burn Down Chart")
      .nl();

    for (const team of teams) {
      mdWriter
        ._("###", team.value, "Burn Down Chart")
        .img(
          `./${clean(team.value)}_burn_down.png`,
          team.value + " Burn Down Chart"
        )
        .nl();
    }
    mdWriter.write(`stats/${name}/`, "README");
  }

  // Write MD file
  const mdWriter = new MDWriter()
    ._("# Safe{Core} Sprint Stats")
    .img(`./total_complexity/${runId}.png`, "Total Complexity")
    .nl();

  if (currentIteration) {
    const name = clean(currentIteration.title);
    mdWriter
      ._("## Current Iteration:", currentIteration.title)
      ._("### Status", runId)
      .img(`./${name}/status_per_team/${runId}.png`, "Current Status")
      ._("### Core Burn Down Chart")
      .img(`./${name}/core_burn_down.png`, "Core Burn Down Chart")
      .nl();

    // Copy into current folder for deep link usage (i.e. like a badge)
    fs.copyFileSync(
      `stats/${name}/status_per_team/${runId}.png`,
      "stats/current/core_status.png"
    );
    fs.copyFileSync(
      `stats/${name}/core_burn_down.png`,
      "stats/current/core_burn_down.png"
    );

    for (const team of teams) {
      mdWriter
        ._("###", team.value, "Burn Down Chart")
        .img(
          `./${name}/${clean(team.value)}_burn_down.png`,
          team.value + " Burn Down Chart"
        )
        .nl();

      // Copy into current folder for deep link usage (i.e. like a badge)
      fs.copyFileSync(
        `stats/${name}/${clean(team.value)}_burn_down.png`,
        `stats/current/${clean(team.value)}_burn_down.png`
      );
    }
  }
  mdWriter.write("stats/", "README");
};
execute();
