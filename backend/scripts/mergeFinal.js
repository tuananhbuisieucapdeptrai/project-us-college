import fs from "fs";
import readline from "readline";

// load IPEDS JSON array
const ipedsArray = JSON.parse(fs.readFileSync("./data/merged.json", "utf8"));

const ipeds = new Map();
for (const row of ipedsArray) {
  ipeds.set(Number(row.unitid), row);
}

console.log("IPEDS loaded:", ipeds.size);

/*
const programs = new Map();

const programsRL = readline.createInterface({
  input: fs.createReadStream("./data/programs_reduced.ndjson"),
  crlfDelay: Infinity
});

for await (const line of programsRL) {
  if (!line.trim()) continue;

  const obj = JSON.parse(line);
  programs.set(Number(obj.id), obj.cip_programs);
}

console.log("Programs loaded:", programs.size);
*/
// stream scorecard
const rl = readline.createInterface({
  input: fs.createReadStream("./data/scorecard_1.ndjson"),
  crlfDelay: Infinity
});



const out = fs.createWriteStream("./data/schools_metadata.ndjson");

let merged = 0;

for await (const line of rl) {
  if (!line.trim()) continue;

  const sc = JSON.parse(line);
  const id = Number(sc.id);

  const ip = ipeds.get(id);
  if (!ip) continue;

  const mergedRow = {
    ...ip,
    city: sc["school.city"],
    state: sc["school.state"],
    student_size: sc["latest.student.size"],
    student_url: sc["school.school_url"]
  };

  out.write(JSON.stringify(mergedRow) + "\n");
  merged++;
}

out.end();

console.log("Merged rows:", merged);