import { GraphConfig, dynamicRender } from "./render";
import { Field, ProjectItem } from "./source";

export type ItemMapper = (item: ProjectItem) => Field;

export const iterationMapper = (item: ProjectItem): Field => item.iteration;
export const teamMapper = (item: ProjectItem): Field => item.team;
export const statusMapper = (item: ProjectItem): Field => item.status;

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

export const complexityGroup = (
  labelMapper: ItemMapper,
  groupMapper: ItemMapper
): ((
  label: string,
  group: string,
  items: Array<ProjectItem>
) => Promise<number>) => {
  return async (label, group, items) => {
    return items
      .filter(
        (item) =>
          labelMapper(item)?.value == label &&
          groupMapper(item)?.value == group &&
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
