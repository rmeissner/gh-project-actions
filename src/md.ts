import { writeFile } from "./utils"

export class MDWriter {
    private parts: string[] = []

    _(...text: string[]): MDWriter {
        this.parts.push(text.join(" "))
        return this
    }

    nl(): MDWriter {
        this.parts.push("\n")
        return this
    }

    img(path: string, title: string, width: number = 600) {
        this.parts.push(`<img src="${path}" width="${width}" title="${title}">\n`)
        return this
    }

    write(path: string, name: string) {
        writeFile(path, name, "md", this.parts.join("\n"))
    }
}