import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const STAGES = [
  "New", "Contacted", "Meeting", "Proposal", "Invoice sent", "Paid", "Lost",
] as const;
export type Stage = (typeof STAGES)[number];

const dateOnly = { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ };
const optText = { type: String, default: null, trim: true };

const LeadSchema = new Schema(
  {
    leadId: { type: String, required: true, unique: true, trim: true },
    company: { type: String, required: true, trim: true },
    industry: optText,
    contact: {
      name: optText,
      role: optText,
      email: optText,
      phone: optText,
    },
    source: optText,
    stage: { type: String, enum: STAGES, required: true },
    dealValueBDT: { type: Number, default: 0, min: 0 },
    lastContact: dateOnly,
    nextFollowUp: dateOnly,
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export type LeadDoc = InferSchemaType<typeof LeadSchema>;

export const Lead: Model<LeadDoc> =
  (mongoose.models.Lead as Model<LeadDoc>) ||
  mongoose.model<LeadDoc>("Lead", LeadSchema, "leads");