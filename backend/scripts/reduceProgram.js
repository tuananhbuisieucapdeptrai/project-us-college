import fs from "fs";
import readline from "readline";

const input = fs.createReadStream("programs.ndjson");
const output = fs.createWriteStream("programs_reduced.ndjson");

const rl = readline.createInterface({ input });

rl.on("line", (line) => {
  const obj = JSON.parse(line);

  const programs = obj["latest.programs.cip_4_digit"];

  const titles = programs
    ? programs.map(p => p.title).filter(Boolean)
    : [];

  output.write(JSON.stringify({
    id: obj.id,
    cip_programs: titles
  }) + "\n");
});