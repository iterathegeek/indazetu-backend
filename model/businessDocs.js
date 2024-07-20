const mongoose = require('mongoose');

const businessDocsSchema = new mongoose.Schema({
  taxClearanceNumber: { type: String, required: true },
  taxClearanceCertificate: {
    public_id: { type: String, required: true },
    url: { type: String, required: true },
  },
  address: {
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String },
  },
  legalRepresentative: {
    fullName: { type: String, required: true },
    idType: { type:String, required: true },
    taxIdentificationNumber: { type: String, required: true },
    taxIdentificationCertificate: {
      public_id: { type: String, required: true },
      url: { type: String, required: true },
    },
  },
  seller: { type: String, required: true },
});

module.exports = mongoose.model('businessDocs', businessDocsSchema);
