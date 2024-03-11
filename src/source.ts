import { Octokit } from "@octokit/core";

export interface Field {
  value: string;
  color?: string | undefined; 
}

export interface Content {
  title: string,
  assignees: {
    nodes: Field[]
  }
}

export interface ProjectItem {
  iteration: Field;
  complexity: Field;
  team: Field;
  qa: Field;
  status: Field;
  content: Content;
}

interface ItemsQueryResult {
  org: {
    project: {
      items: {
        pageInfo: {
          endCursor: string;
          hasNextPage: boolean;
        };
        nodes: ProjectItem[];
      };
    };
  };
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
          qa: fieldValueByName(name: "QA") {
            ... on ProjectV2ItemFieldSingleSelectValue {
              value: name
            }
          }
          content {
            ... on DraftIssue {
              title
              assignees(first: 5) {
                nodes {
                  value: login
                }
              }
            }
            ... on Issue {
              title
              assignees(first: 5) {
                nodes {
                  value: login
                }
              }
            }
            ... on PullRequest {
              title
              assignees(first: 5) {
                nodes {
                  value: login
                }
              }
            }
          }
        }
      }
    }
  }
}`;

export interface Iteration {
  title: string;
  startDate: string;
  duration: number;
}

interface IterationsQueryResult {
  org: {
    project: {
      iteration: {
        configuration: {
          completed: Iteration[]
          open: Iteration[]
        }
      };
    };
  };
}

const QUERY_ITERATIONS = `query ($login: String!, $number: Int!) {
  org: organization(login: $login) {
    project: projectV2(number: $number) {
      iteration: field(name: "Iteration") {
        ... on ProjectV2IterationField {
          configuration {
            completed: completedIterations {
              title
              startDate
              duration
            }
            open: iterations {
              title
              startDate
              duration
            }
          }
        }
      }
    }
  }
}`;

interface SingleSelectQueryResult {
  org: {
    project: {
      select: {
        options: Field[];
      };
    };
  };
}

const QUERY_SINGLE_SELECT = `query ($login: String!, $number: Int!, $name: String!) {
  org: organization(login: $login) {
    project: projectV2(number: $number) {
      select: field(name: $name) {
        ... on ProjectV2SingleSelectField {
          options {
            value: name,
            color
          }
        }
      }
    }
  }
}`;

const octokit = new Octokit({ auth: process.env.API_ACCESS_TOKEN });
const githubOrg = process.env.GH_ORG;
const githubOrgProjectNumber = parseInt(process.env.GH_ORG_PROJECT_NUMBER);

export const loadTeams = async (): Promise<Field[]> => {
  const response: SingleSelectQueryResult = await octokit.graphql(QUERY_SINGLE_SELECT, {
    login: githubOrg,
    number: githubOrgProjectNumber,
    name: "Team"
  });
  return response.org.project.select.options;
};

export const loadIterations = async (openOnly: boolean = false): Promise<Iteration[]> => {
  const response: IterationsQueryResult = await octokit.graphql(QUERY_ITERATIONS, {
    login: githubOrg,
    number: githubOrgProjectNumber
  });
  const iterationsConfiguration = response.org.project.iteration.configuration
  if (openOnly) return iterationsConfiguration.open
  return iterationsConfiguration.completed.concat(iterationsConfiguration.open);
};

export const loadStati = async (): Promise<Field[]> => {
  const response: SingleSelectQueryResult = await octokit.graphql(QUERY_SINGLE_SELECT, {
    login: githubOrg,
    number: githubOrgProjectNumber,
    name: "Status"
  });
  return response.org.project.select.options;
};

export const loadQA = async (): Promise<Field[]> => {
  const response: SingleSelectQueryResult = await octokit.graphql(QUERY_SINGLE_SELECT, {
    login: githubOrg,
    number: githubOrgProjectNumber,
    name: "QA"
  });
  return response.org.project.select.options;
};

export const loadItems = async (): Promise<ProjectItem[]> => {
  const allItems = [];
  let cursor = null;
  do {
    const response: ItemsQueryResult = await octokit.graphql(QUERY_ITEMS, {
      login: githubOrg,
      number: githubOrgProjectNumber,
      next: cursor,
    });
    allItems.push(...response.org.project.items.nodes);
    cursor = response.org.project.items.pageInfo.endCursor;
  } while (!!cursor);
  return allItems;
};
