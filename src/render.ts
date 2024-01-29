import { createCanvas } from "canvas";
import { Chart } from "chart.js/auto";
import fs from "fs";
import { writeFile } from "./utils";

export interface GroupConfig {
  fill?: boolean | string;
  backgroundColor?: string;
}

export interface GraphConfig {
  type?: "bar" | "line" | undefined;
  stacked?: boolean | undefined;
  path: string;
  name: string;
  groupConfigs?: Map<string, GroupConfig>;
}

export interface GraphDataset {
  label: string;
  data: number[];
}

const generatePNG = (
  labels: string[],
  datasets: GraphDataset[],
  config: GraphConfig
): Buffer => {
  const width = 1200,
    height = 800;

  const canvas = createCanvas(width, height);
  // Note: ChartJS cannot use the context returned by canvas
  const ctx: any = canvas.getContext("2d");

  const plugin = {
    id: "customCanvasBackgroundImage",
    beforeDraw: (chart: Chart) => {
      const ctx = chart.ctx;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
  };

  new Chart(ctx, {
    type: config.type ?? "bar",
    data: {
      labels,
      datasets: datasets.map((ds) => ({
        fill: "-1",
        ...ds,
        ...config.groupConfigs?.get(ds.label),
      })),
    },
    options: {
      indexAxis: "x",
      scales: {
        x: {
          stacked: config.stacked,
        },
        y: {
          min: 0,
          stacked: config.stacked,
        },
      },
    },
    plugins: [plugin],
  });

  return canvas.toBuffer("image/png");
};

export const buildDatasets = async <I>(
  items: Array<I>,
  labelProcessor: (items: Array<I>) => Promise<Array<string>>,
  groupsProcessor: (items: Array<I>) => Promise<Array<string>>,
  dataProcessor: (
    label: string,
    group: string,
    items: Array<I>
  ) => Promise<number>
): Promise<{ labels: Array<string>; datasets: Array<GraphDataset> }> => {
  const labels: Array<string> = await labelProcessor(items);
  const groups: Array<string> = await groupsProcessor(items);
  const datasets: Array<GraphDataset> = await Promise.all(
    groups.map(async (group) => {
      return {
        label: group,
        data: await Promise.all(
          labels.map((label) => dataProcessor(label, group, items))
        ),
      };
    })
  );
  return {
    labels,
    datasets,
  };
};

export const render = async (
  labels: Array<string>,
  datasets: Array<GraphDataset>,
  config: GraphConfig
): Promise<any> => {
  const graphBuffer = generatePNG(labels, datasets, config);
  writeFile(config.path, config.name, "png", graphBuffer);
};

export const dynamicRender = async <I>(
  items: Array<I>,
  labelProcessor: (items: Array<I>) => Promise<Array<string>>,
  groupsProcessor: (items: Array<I>) => Promise<Array<string>>,
  dataProcessor: (
    label: string,
    group: string,
    items: Array<I>
  ) => Promise<number>,
  config: GraphConfig
): Promise<any> => {
  const { labels, datasets } = await buildDatasets(
    items,
    labelProcessor,
    groupsProcessor,
    dataProcessor
  );
  await render(labels, datasets, config);
};
