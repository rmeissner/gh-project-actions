import { createCanvas } from "canvas";
import { Chart } from "chart.js/auto";
import fs from "fs";

export interface GraphConfig {
  stacked?: boolean | undefined;
  path: string;
  name: string;
}

interface GraphDataset {
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
    type: "bar",
    data: {
      labels,
      datasets,
    },
    options: {
      indexAxis: "x",
      scales: {
        x: {
          stacked: config.stacked,
        },
        y: {
          stacked: config.stacked,
        },
      },
    },
    plugins: [plugin],
  });

  return canvas.toBuffer("image/png");
};

export const dynamicRender = async <I>(
  items: Array<I>,
  labelProcessor: (items: Array<I>) => Promise<Array<string>>,
  groupsProcessor: (items: Array<I>) => Promise<Array<string>>,
  dataProcessor: (label: string, group: string, items: Array<I>) => Promise<number>,
  config: GraphConfig
): Promise<any> => {
  const labels: Array<string> = await labelProcessor(items);
  const groups: Array<string> = await groupsProcessor(items);
  const datasets: Array<GraphDataset> = await Promise.all(
    groups.map(async (group) => {
        return {
            label: group,
            data: await Promise.all(labels.map((label) => dataProcessor(label, group, items)))
        }
        
    })
  );
  const graphBuffer = generatePNG(labels, datasets, config);

    // TODO: extract
  if (!fs.existsSync(config.path)) fs.mkdirSync(config.path, { recursive: true });
  fs.writeFileSync(config.path + config.name + ".png", graphBuffer);
};