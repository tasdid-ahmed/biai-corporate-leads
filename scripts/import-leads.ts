import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import Papa from "papaparse";
import { connectDB } from "../src/lib/mongodb";
import { Lead } from "../src/models/Lead";

type Row = Record<string, string>;
const clean = (v?: string) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

async function main() {
  const file = path.join(process.cwd(), "data", "corporate-leads.csv");
  if (!fs.existsSync(file)) throw new Error(`CSV not found at ${file}`);

  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""); // strip BOM
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) throw new Error(JSON.stringify(parsed.errors));

  await connectDB();
  if (process.argv.includes("--reset")) {
    await Lead.deleteMany({});
    console.log("Collection cleared (--reset).");
  }

  // $setOnInsert = rerunning never overwrites leads you edited in the app.
  const ops = parsed.data.map((r) => ({
    updateOne: {
      filter: { leadId: r["lead id"].trim() },
      update: {
        $setOnInsert: {
          leadId: r["lead id"].trim(),
          company: r["company"].trim(),
          industry: clean(r["industry"]),
          contact: {
            name: clean(r["contact name"]),
            role: clean(r["contact role"]),
            email: clean(r["contact email"]),
            phone: clean(r["contact phone"]),
          },
          source: clean(r["source"]),
          stage: r["stage"].trim(),
          dealValueBDT: Number(r["deal value (BDT)"]) || 0,
          lastContact: clean(r["last contact"]),
          nextFollowUp: clean(r["next follow-up"]),
          notes: (r["notes"] ?? "").trim(),
        },
      },
      upsert: true,
    },
  }));

  const res = await Lead.bulkWrite(ops);
  console.log(`Inserted: ${res.upsertedCount}, already existed: ${res.matchedCount}`);

  const all = await Lead.find().sort({ leadId: 1 }).lean();
  const total = all.reduce((s, l) => s + l.dealValueBDT, 0);
  console.log(`Total leads in DB: ${all.length}`);
  console.log(`Total deal value: ${total}`);
  console.log(`First/last: ${all[0].leadId} / ${all[all.length - 1].leadId}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("Import failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});