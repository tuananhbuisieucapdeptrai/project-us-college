// fetch_wikipedia.js
import fs from "fs";
import readline from "readline";
import axios from "axios";

const INPUT = "./data/schools_metadata.ndjson";
const OUTPUT = "./data/schools_metadata_with_wiki_v1.ndjson";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));


function normalizeName(name) {
    return String(name || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "") 
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
async function fetchWiki(name) {
    const clean = normalizeName(name);
  
    // Try direct summary first
    try {
      const encoded = encodeURIComponent(clean);
  
      const res = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
        {
          timeout: 8000,
          headers: {
            "User-Agent": "college-recommender (test@example.com)"
          }
        }
      );
  
      const data = res.data;
  
      if (data?.extract) {
        return {
          wikipedia_url: data?.content_urls?.desktop?.page || null,
          description: data?.extract || null,
          image_url: data?.thumbnail?.source || null
        };
      }
    } catch (_) {}
  
    // fallback: replace & and retry
    try {
      const fallback = clean.replace(/\s*&\s*/g, "&");
      const encoded = encodeURIComponent(fallback);
  
      const res = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
        {
          timeout: 8000,
          headers: {
            "User-Agent": "college-recommender (test@example.com)"
          }
        }
      );
  
      const data = res.data;
  
      return {
        wikipedia_url: data?.content_urls?.desktop?.page || null,
        description: data?.extract || null,
        image_url: data?.thumbnail?.source || null
      };
  
    } catch (_) {
      return {
        wikipedia_url: null,
        description: null,
        image_url: null
      };
    }
  }
async function main() {
  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT),
    crlfDelay: Infinity
  });

  const out = fs.createWriteStream(OUTPUT);

  let count = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    const record = JSON.parse(line);

    const wiki = await fetchWiki(record.name);

    const enriched = {
      ...record,
      ...wiki
    };

    out.write(JSON.stringify(enriched) + "\n");

    count++;
    if (count % 50 === 0) {
      console.log("Processed:", count);
    }

    await delay(100); // be nice to wikipedia
  }

  out.end();
  console.log("Done.");
}

main();