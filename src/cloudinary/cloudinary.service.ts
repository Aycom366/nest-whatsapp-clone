// cloudinary.service.ts

import { Injectable } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";
const streamifier = require("streamifier");
import { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";

export type CloudinaryResponse = UploadApiResponse | UploadApiErrorResponse;

@Injectable()
export class CloudinaryService {
  uploadFile(file: Express.Multer.File): Promise<CloudinaryResponse> {
    return new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
