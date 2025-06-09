import fs from "fs";
import readline from "readline";
import path from "path";

const INPUT = "../public/postcode_to_bua_mapped.csv";
const OUTPUT_DIR = "../public/chunks";
const ROWS_PER_FILE = 100000;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

async function splitCsv() {
  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT),
    crlfDelay: Infinity,
  });
  let headers,
    stream,
    i = 0,
    row = 0;

  for await (const line of rl) {
    if (!headers) {
      headers = line;
      continue;
    }
    if (row % ROWS_PER_FILE === 0) {
      stream?.end();
      stream = fs.createWriteStream(path.join(OUTPUT_DIR, `chunk_${++i}.csv`));
      stream.write(headers + "\n");
    }
    stream.write(line + "\n");
    row++;
  }
  stream?.end();
  console.log(`✅ Created ${i} chunks`);
}

splitCsv().catch(console.error);
