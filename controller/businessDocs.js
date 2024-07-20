
const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary');
const businessDocs = require('../model/businessDocs');
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");

router.post("/create-or-update-business-docs", catchAsyncErrors(async (req, res, next) => {
  try {

    console.log('hello', req.body)

    const {
      taxClearanceNumber,
      taxClearanceCertificate,
      taxIdentificationCertificate,
      fullName,
      idType,
      taxIdentificationNumber,
      postalCode,
      city,
      state,
      country,
      addressLine1,
      addressLine2,
      seller

    } = req.body;

 // Check if business docs already exist
 const existingBusinessDocs = await businessDocs.findOne({ seller });

 // Handle file uploads
 const taxClearanceCertificateFile = taxClearanceCertificate;
 const taxIdentificationCertificateFile = taxIdentificationCertificate;

 const taxClearanceCertificateUpload = await cloudinary.v2.uploader.upload(taxClearanceCertificateFile, {
   folder: 'tax_clearance_certificates',
 });

 const taxIdentificationCertificateUpload = await cloudinary.v2.uploader.upload(taxIdentificationCertificateFile, {
   folder: 'tax_identification_certificates',
 });

 const businessDocsData = {
   seller,
   taxClearanceNumber,
   taxClearanceCertificate: {
     public_id: taxClearanceCertificateUpload.public_id,
     url: taxClearanceCertificateUpload.secure_url,
   },
   address: {
     addressLine1,
     addressLine2,
     city,
     state,
     country,
     postalCode,
   },
   legalRepresentative: {
     fullName,
     idType,
     taxIdentificationNumber,
     taxIdentificationCertificate: {
       public_id: taxIdentificationCertificateUpload.public_id,
       url: taxIdentificationCertificateUpload.secure_url,
     },
   },
 };

 if (existingBusinessDocs) {
   // Update existing document
   await businessDocs.updateOne({ seller }, businessDocsData);
   res.status(200).json({
     success: true,
     message: 'BusinessDocs updated successfully',
     businessDocs: businessDocsData,
   });
 } else {
   // Create new document
   const newBusinessDocs = new businessDocs(businessDocsData);
   await newBusinessDocs.save();

   res.status(201).json({
     success: true,
     message: 'BusinessDocs created successfully',
     businessDocs: newBusinessDocs,
   });
 }
} catch (error) {
 return next(new ErrorHandler(error.message, 500));
}
}));


router.get('/get-business-docs/:shop', async (req, res) => {
  const seller=req.params.shop;
  console.log('docs', seller);
  const businessDoc = await businessDocs.findOne({seller});
  console.log('docs', businessDoc);
  if (businessDoc) {
    console.log('docs', businessDoc)
    res.json(businessDoc);
  } else {
    res.status(404).json({ message: 'No business documents found' });
  }
})

module.exports = router;
