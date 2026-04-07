import fs from "fs";
import axios from "axios";
import "dotenv/config";

const stream = fs.createWriteStream("scorecard.ndjson");
const fields = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.ope6_id",
  
  "latest.student.size",
  "latest.student.faculty_ratio",
  "latest.student.retention_rate.four_year.full_time",
  "latest.earnings.10_yrs_after_entry.median",
  
].join(",");

async function fetchAll() {
  let page = 0;

  while (true) {
    const res = await axios.get("https://api.data.gov/ed/collegescorecard/v1/schools", {
      params: {
        api_key: process.env.SCORECARD_API_KEY,
        _fields: fields,
        _per_page: 100,
        _page: page
      }
    });

    const schools = res.data.results;
    if (!schools.length) break;

    for (const school of schools) {
      stream.write(JSON.stringify(school) + "\n");
    }

    console.log("page", page);
    page++;
  }

  stream.end();
}

fetchAll();