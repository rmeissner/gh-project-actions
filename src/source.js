import { Octokit } from "@octokit/core";

const QUERY_ITEMS = `query ($login: String!, $number: Int!, $next: String) {
    org: organization(login: $login) {
      project: projectV2(number: $number) {
        items(first: 100, after: $next, orderBy: {field: POSITION, direction: ASC}) {
          totalCount
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            iteration: fieldValueByName(name: "Iteration") {
              ... on ProjectV2ItemFieldIterationValue {
                title
              }
            }
            complexity: fieldValueByName(name: "Complexity") {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
              }
            }
            team: fieldValueByName(name: "Team") {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
              }
            }
            status: fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
              }
            }
          }
        }
      }
    }
  }`;

const octokit = new Octokit({ auth: process.env.API_ACCESS_TOKEN });
const githubOrg = process.env.GH_ORG;

export const loadStats = async () => {
    const stats = {};
    let cursor = null;
    const teams = new Set();
    const stati = new Set();
    do {
      const response = await octokit.graphql(QUERY_ITEMS, {
        login: githubOrg,
        number: 14,
        next: cursor,
      });
      console.log(response.org.project.items.pageInfo);
      for (const item of response.org.project.items.nodes) {
        if (!item.iteration) continue;
        const iteration = item.iteration.title;
        if (!stats[iteration]) stats[iteration] = {};
        const team = item.team ? item.team.name : "unknown";
        if (!stats[iteration][team]) stats[iteration][team] = {};
        const status = item.status ? item.status.name : "unknown";
        if (!stats[iteration][team][status]) stats[iteration][team][status] = {};
        const complexity = item.complexity ? item.complexity.name : "0";
        if (!stats[iteration][team][status][complexity])
          stats[iteration][team][status][complexity] = 0;
        stats[iteration][team][status][complexity]++;
        teams.add(team);
        stati.add(status);
      }
      cursor = response.org.project.items.pageInfo.endCursor;
    } while (!!cursor);
    
    return { 
        stats,
        teams, 
        stati 
    }
}