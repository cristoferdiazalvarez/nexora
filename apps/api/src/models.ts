import mongoose, { Schema } from "mongoose";
const options = { timestamps: true } as const;
export const Organization = mongoose.model(
  "Organization",
  new Schema(
    {
      name: { type: String, required: true },
      taxBps: { type: Number, default: 2100 },
      address: { type: String, default: "" },
    },
    options,
  ),
);
export const User = mongoose.model(
  "User",
  new Schema(
    {
      organization: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true, select: false },
      role: { type: String, enum: ["admin", "empleado"], required: true },
    },
    options,
  ),
);
export const Session = mongoose.model(
  "Session",
  new Schema(
    {
      token: { type: String, unique: true },
      user: { type: Schema.Types.ObjectId, required: true },
      expires: { type: Date, expires: 0 },
    },
    options,
  ),
);
const scoped = {
  organization: { type: Schema.Types.ObjectId, required: true, index: true },
};
export const Client = mongoose.model(
  "Client",
  new Schema(
    {
      ...scoped,
      name: { type: String, required: true },
      email: String,
      taxId: String,
      address: String,
    },
    options,
  ),
);
export const Product = mongoose.model(
  "Product",
  new Schema(
    {
      ...scoped,
      name: { type: String, required: true },
      priceCents: { type: Number, required: true },
      kind: { type: String, enum: ["producto", "servicio"] },
    },
    options,
  ),
);
const invoiceSchema = new Schema(
  {
    ...scoped,
    number: { type: String, required: true },
    clientId: { type: Schema.Types.ObjectId, required: true },
    clientName: String,
    issuerName: String,
    issuerAddress: String,
    clientAddress: String,
    clientTaxId: String,
    dueDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["pendiente", "pagada"],
      default: "pendiente",
    },
    lines: [{ name: String, quantity: Number, priceCents: Number }],
    taxBps: Number,
    subtotalCents: Number,
    taxCents: Number,
    totalCents: Number,
  },
  options,
);
invoiceSchema.index({ organization: 1, number: 1 }, { unique: true });
invoiceSchema.index({ organization: 1, createdAt: -1, _id: -1 });
export const Invoice = mongoose.model("Invoice", invoiceSchema);
