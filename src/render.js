import { calculateComplexity } from "./utils/complexity.js";
import { generateGraph } from "./utils/graphs.js";

export const renderStats = async ({ stats, teams, stati }) => {
  const sortedTeams = Array.from(teams).sort();
  const sortedStati = Array.from(stati).sort();
  const totalLabels = [];
  const totalDatasets = {};
  const totalDatasetsArray = [];
  for (const team of sortedTeams) {
    const dataset = {
      label: team,
      data: [],
    };
    totalDatasets[team] = dataset;
    totalDatasetsArray.push(dataset);
  }

  for (const iteration in stats) {
    let totalComplexity = 0;
    let complexityPerTeam = {};
    let complexityPerStatus = {};
    const iterationStats = stats[iteration];
    for (const team in iterationStats) {
      const teamStats = iterationStats[team];
      for (const state in teamStats) {
        const stateStats = teamStats[state];
        for (const complexity in stateStats) {
          const complexityNum = parseInt(complexity) * stateStats[complexity];
          if (!complexityPerTeam[team]) complexityPerTeam[team] = 0;
          complexityPerTeam[team] += complexityNum;
          if (!complexityPerStatus[state]) complexityPerStatus[state] = 0;
          complexityPerStatus[state] += complexityNum;
          totalComplexity += complexityNum;
        }
      }
    }
    totalLabels.push(iteration);
    console.log("####################################################");
    console.log(iteration);
    console.log("----------------------------------------------------");
    console.log("Total complexity:", totalComplexity);
    console.log("Complexity by team:", complexityPerTeam);
    console.log("Complexity by status:", complexityPerStatus);
    console.log("Distribution:", iterationStats);
    console.log("----------------------------------------------------");
    console.log("");
    const datasets = [];
    for (const status of sortedStati) {
      const data = [];
      for (const team of sortedTeams) {
        const stats = iterationStats[team];
        data.push(!stats ? 0 : calculateComplexity(stats[status]));
      }
      datasets.push({
        label: status,
        data,
      });
    }

    for (const team of sortedTeams) {
      totalDatasets[team].data.push(complexityPerTeam[team] || 0);
    }
    generateGraph(
      "per_team",
      {
        labels: sortedTeams,
        datasets,
      },
      iteration,
      true
    );
  }
  generateGraph("total_complexity", {
    labels: totalLabels,
    datasets: totalDatasetsArray,
  });
};
