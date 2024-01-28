import { GraphDataset, render } from "./render"
import { Field, Iteration } from "./source"
import { asDate, clean, readJsonFile, writeFile } from "./utils"

export const updateBurnDown = async (runId: string, stati: Field[], iteration: Iteration, team: string, newDatasets: GraphDataset[]) => {
    const name = clean(iteration.title)
    // Store new Burn Down Data
    writeFile(`stats/${name}/burn_down_data/`, `${team}_${runId}`, "json", JSON.stringify(newDatasets))
    // Render Burn Down Chart
    const labels =  []
    const coreBurnDatasets: GraphDataset[] = []
    for (const status of stati) {
      coreBurnDatasets.push({
        label: status.value,
        data: []
      })
    }
    for (let i = 0; i <= iteration.duration; i++) {
      const label = asDate(iteration.startDate, i).toISOString().slice(0, 10)
      labels.push(labels)
      const loadedData: GraphDataset[] = readJsonFile(`stats/${name}/burn_down_data/`, `${team}_${label}`)
      coreBurnDatasets.forEach((dataset, index) => {
        dataset.data.push(loadedData?.at(index)?.data?.at(0) ?? 0)
      })
    }
    await render(labels, coreBurnDatasets, {
      type: "line",
      path: `stats/${name}/`,
      name: `${team}_burn_down`,
      stacked: true,
    })
}