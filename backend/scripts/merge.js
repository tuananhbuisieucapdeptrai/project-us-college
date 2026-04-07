import fs from "fs";
import csv from "csv-parser";
import stripBom from "strip-bom-stream";

const hd = new Map();
const adm = new Map();
const cost = new Map();
const ic  = new Map();

function loadCSV(path, target) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(path)
      .pipe(stripBom())
      .pipe(csv())
      .on("data", (row) => {
        const id = row.UNITID?.trim();
        if (!id) return;
        target.set(id, row);
      })
      .on("end", resolve)
      .on("error", reject);
  });
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function safeDivide(a, b) {
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

async function main() {
  await loadCSV("data/HD2024.csv", hd);
  await loadCSV("data/ADM2024.csv", adm);
  await loadCSV("data/COST1_2024.csv", cost);
  await loadCSV("data/IC2024.csv", ic)

  const merged = [];

  for (const [unitid, school] of hd.entries()) {
    const admission = adm.get(unitid);
    const pricing = cost.get(unitid);

    if (!admission) continue;

    const applcn = toNumber(admission.APPLCN);
    const admssn = toNumber(admission.ADMSSN);
    const enrlt = toNumber(admission.ENRLT);

    const satvr50 = toNumber(admission.SATVR50);
    const satmt50 = toNumber(admission.SATMT50);
    const satnum = toNumber(admission.SATNUM);
    const satpct = toNumber(admission.SATPCT);

    const satTotal50 =
      satvr50 !== null && satmt50 !== null ? satvr50 + satmt50 : null;

    const admissionRate = safeDivide(admssn, applcn);
    const yieldRate = safeDivide(enrlt, admssn);

  
    const tuition1 = pricing ? toNumber(pricing.TUITION1) : null;
    const tuition2 = pricing ? toNumber(pricing.TUITION2) : null;
    const tuition3 = pricing ? toNumber(pricing.TUITION3) : null;
    const roomBoard = pricing ? toNumber(pricing.RMBRDAMT) : null;

    if (satTotal50 === null && admissionRate === null) continue;
    const estimated_room_board = 12000;
    /*
    merged.push({
      unitid,
      ope6_id: school.OPEID?.substring(0,6),
      name: school.INSTNM,
      //city: school.CITY,
      //state: school.STABBR,
      control: school.CONTROL,
      //iclevel: school.ICLEVEL,
      locale: school.LOCALE,
      //longitude: toNumber(school.LONGITUD),
      //latitude: toNumber(school.LATITUDE),
      carnegie_code: school.CARNEGIE2021

      //applicants: applcn,
      //admitted: admssn,
      //enrolled: enrlt,
      //admission_rate: admissionRate,
      //yield_rate: yieldRate,

      //sat_submitters: satnum,
      //sat_submit_percent: satpct,
      //sat_verbal_50: satvr50,
      //sat_math_50: satmt50,
      //sat_total_50: satTotal50,

      //tuition_in_state: tuition1,
      //tuition_out_state: tuition2,
      //tuition_intl: tuition3,
      //room_board: roomBoard,
      //cost_total: tuition3+(roomBoard ?? estimated_room_board),
  

    


    });*/




  merged.push({
    unitid,
    ope6_id: school.OPEID?.substring(0,6),
    name: school.INSTNM,
    admission_rate: admissionRate,
    control: school.CONTROL,
    locale: school.LOCALE,

    carnegie_code: toNumber(school.C21BASIC)
  });
}

  fs.writeFileSync("merged.json", JSON.stringify(merged, null, 2));
  console.log(`Merged rows: ${merged.length}`);
}

main().catch(console.error);