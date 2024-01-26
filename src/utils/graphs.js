import { Chart } from "chart.js/auto";
import { createCanvas } from "canvas";
import fs from "fs";

const runId = new Date().toISOString().slice(0, 10);

export const generateGraph = (name, data, folder = "", stacked = false) => {
    const width = 1200,
      height = 800;
  
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
  
    const plugin = {
      id: "customCanvasBackgroundImage",
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      },
    };
  
    new Chart(ctx, {
      type: "bar",
      data,
      options: {
        indexAxis: "x",
        legend: {
          position: "top",
        },
        title: {
          display: true,
          text: "Horizontal Floating Bars",
        },
        scales: {
          x: {
            stacked,
          },
          y: {
            stacked,
          },
        },
      },
      plugins: [plugin],
    });
  
    const path = "./graphs/" + runId + "/" + folder + "/";
    if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(path + name + ".png", buffer);
  };