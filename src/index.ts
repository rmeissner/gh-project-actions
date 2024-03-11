import "dotenv/config";
import {
  Iteration,
  loadItems,
  loadIterations,
  loadQA,
  loadStati,
  loadTeams,
} from "./source";
import {
  asDate,
  assigneesMapper,
  clean,
  complexityGroup,
  groupBy,
  iterationMapper,
  labelReducer,
  qaMapper,
  renderSimple,
  staticLabels,
  statusMapper,
  stringLabels,
  teamMapper,
  writeFile,
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
  const qa = await loadQA();
  const iterations = await loadIterations();
  const itemsPerIteration = groupBy(data, iterationMapper);

  // Stats for recent iterations
  const recentIterations = Array.from(iterations)
    .filter((item) => asDate(item.startDate) <= new Date())
    .sort((left, right) => left.startDate.localeCompare(right.startDate))
    .slice(-4)
    .map((i) => i.title);

  await renderSimple(
    data.filter((item) => recentIterations.indexOf(item.iteration?.value) >= 0),
    assigneesMapper,
    iterationMapper,
    {
      path: "stats/member_complexity/",
      name: runId,
    }
  );

  // Stats for active iterations
  let currentIteration: Iteration = null;
  for (const iteration of iterations) {
    const iterationItems = itemsPerIteration[iteration.title];
    if (!iterationItems) continue;
    const name = clean(iteration.title);
    const startDate = asDate(iteration.startDate);
    const endDate = asDate(iteration.startDate, iteration.duration + 1);
    if (startDate > now || endDate <= now) continue;
    currentIteration = iteration;

    // Persis items for iteration
    writeFile(
      `stats/${name}/data_snapshots/`,
      `items_${runId}`,
      "json",
      JSON.stringify(iterationItems)
    );

    // Render Status per Team member per Day graph
    await dynamicRender(
      iterationItems,
      labelReducer(assigneesMapper),
      staticLabels(stati),
      complexityGroup(assigneesMapper, statusMapper),
      {
        path: `stats/${name}/status_per_teammember/`,
        name: runId,
        stacked: true,
      }
    );

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

    await dynamicRender(
      iterationItems,
      staticLabels(qa),
      labelReducer(teamMapper),
      complexityGroup(qaMapper, teamMapper),
      {
        path: `stats/${name}/qa/`,
        name: runId,
        stacked: true,
      }
    );

    // Create Core Status distribution for Core Burn Down Chart
    const qaBurn = await buildDatasets(
      iterationItems,
      stringLabels([runId]),
      staticLabels(qa),
      complexityGroup(undefined, qaMapper)
    );

    updateBurnDown(runId, qa, iteration, "qa", qaBurn.datasets);

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
    mdWriter
      ._("### Team member Status", runId)
      .img(`./status_per_teammember/${runId}.png`, "Current Member Status")
      .write(`stats/${name}/`, "README");
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
