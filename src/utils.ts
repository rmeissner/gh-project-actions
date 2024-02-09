import { GraphConfig, dynamicRender } from "./render";
import { Field, ProjectItem } from "./source";
import fs from "fs";

export const clean = (value: string): string => value.toLowerCase().replace(" ", "_")

export const readJsonFile = (path: string, name: string) : any | undefined => {
    const fileName = path + name + ".json"
    if (!fs.existsSync(fileName)) return undefined
    return JSON.parse(fs.readFileSync(fileName, "utf8"))
}

export const writeFile = (path: string, name: string, ending: string, content: string | Buffer) => {
  if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
  fs.writeFileSync(path + name + "." + ending, content);
};

export const asDate = (value: string | Date, daysOffset: number = 0): Date => {
  const date = new Date(value);
  if (daysOffset != 0) {
    date.setDate(date.getDate() + daysOffset);
  }
  return date;
};

export type ItemMapper = (item: ProjectItem) => Field | undefined;

export const iterationMapper: ItemMapper = (item: ProjectItem): Field => item.iteration;
export const teamMapper: ItemMapper = (item: ProjectItem): Field => item.team;
export const assigneesMapper: ItemMapper = (item: ProjectItem): Field => item.content?.assignees?.nodes?.at(0);
export const statusMapper: ItemMapper = (item: ProjectItem): Field => item.status;

export const labelReducer = (
  keyMapper: ItemMapper
): ((items: Array<ProjectItem>) => Promise<Array<string>>) => {
  return async (items: ProjectItem[]) =>
    Array.from(
      items.reduce(
        (labels: Set<string>, value: ProjectItem) =>
          labels.add(keyMapper(value)?.value ?? "unknown"),
        new Set()
      )
    ).sort();
};

export const staticLabels = (
  labels: Field[]
): ((items: Array<ProjectItem>) => Promise<Array<string>>) => {
  return async () => labels.map((label) => label.value);
};

export const stringLabels = (
  labels: string[]
): ((items: Array<ProjectItem>) => Promise<Array<string>>) => {
  return async () => labels;
};

export const complexityGroup = (
  labelMapper?: ItemMapper,
  groupMapper?: ItemMapper
): ((
  label: string,
  group: string,
  items: Array<ProjectItem>
) => Promise<number>) => {
  return async (label, group, items) => {
    return items
      .filter(
        (item) =>
          (!labelMapper || (labelMapper(item)?.value ?? "unknown") === label) &&
          (!groupMapper || (groupMapper(item)?.value ?? "unknown") === group) &&
          !!item.complexity?.value
      )
      .reduce((sum, item) => sum + parseInt(item.complexity.value), 0);
  };
};

export const groupBy = (
  items: ProjectItem[],
  keyMapper: ItemMapper
): Record<string, ProjectItem[]> => {
  return items.reduce(function (groups, item) {
    const key = keyMapper(item)?.value ?? "unknown";
    (groups[key] = groups[key] || []).push(item);
    return groups;
  }, {});
};

export const renderSimple = async (
  data: ProjectItem[],
  labelMapper: ItemMapper,
  groupMapper: ItemMapper,
  config: GraphConfig
) => {
  await dynamicRender(
    data,
    labelReducer(labelMapper),
    labelReducer(groupMapper),
    complexityGroup(labelMapper, groupMapper),
    config
  );
};
