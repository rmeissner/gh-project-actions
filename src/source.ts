import { Octokit } from "@octokit/core";

export interface Field {
  value: string
}

export interface ProjectItem {
  iteration: Field
  complexity: Field
  team: Field
  status: Field
}

interface ItemsQueryResult {
  org: {
    project: {
      items: {
        pageInfo: {
          endCursor: string
          hasNextPage: boolean
        }
        nodes: ProjectItem[]
      }
    }
  }
}

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
                value: title
              }
            }
            complexity: fieldValueByName(name: "Complexity") {
              ... on ProjectV2ItemFieldSingleSelectValue {
                value: name
              }
            }
            team: fieldValueByName(name: "Team") {
              ... on ProjectV2ItemFieldSingleSelectValue {
                value: name
              }
            }
            status: fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue {
                value: name
              }
            }
          }
        }
      }
    }
  }`;

const octokit = new Octokit({ auth: process.env.API_ACCESS_TOKEN });
const githubOrg = process.env.GH_ORG;

export const loadItems = async (): Promise<ProjectItem[]> => {
  const allItems = []
  let cursor = null;
  do {
    const response: ItemsQueryResult = await octokit.graphql(QUERY_ITEMS, {
      login: githubOrg,
      number: 14,
      next: cursor,
    });
    allItems.push(...response.org.project.items.nodes);
    cursor = response.org.project.items.pageInfo.endCursor;
  } while (!!cursor);
  return allItems
}