import fs from "fs";
import readline from "readline";

const INPUT = "./data/schools_metadata_with_wiki_v1.ndjson";
const OUTPUT = "./data/schools_metadata.csv";

const headers = [
  "unitid",
  "name",
  "admission_rate",
  "student_size",
  "city",
  "state",
  "school_url",
  "wikipedia_url",
  "description",
  "image_url"
];

function escapeCSV(value) {
  if (value === null || value === undefined) return "";

  const str = String(value)
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/[",{}]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

async function run() {
  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT),
    crlfDelay: Infinity
  });

  const rows = [headers.join(",")];

  for await (const line of rl) {
    if (!line.trim()) continue;

    const row = JSON.parse(line);

    const csvRow = {
      unitid: row.unitid,
      name: row.name,
      admission_rate: row.admission_rate,
      student_size: row.student_size,
      city: row.city,
      state: row.state,
      school_url: row.student_url,
      wikipedia_url: row.wikipedia_url,
      description: row.description,
      image_url: row.image_url
    };

    rows.push(
      headers.map(h => escapeCSV(csvRow[h])).join(",")
    );
  }

  fs.writeFileSync(OUTPUT, rows.join("\n"));
  console.log("CSV generated:", OUTPUT);
}

run();