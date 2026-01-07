import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    // For dev: use local uploads directory
    // For prod: this would be replaced with S3 adapter
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirExists();
  }

  /**
   * Upload file to storage
   * In dev: saves to local uploads directory
   * In prod: would upload to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<string> {
    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const randomId = randomBytes(8).toString('hex');
    const fileName = `${randomId}${fileExtension}`;
    const folderPath = path.join(this.uploadDir, folder);
    const filePath = path.join(folderPath, fileName);

    // Ensure folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Save file locally (dev mode)
    fs.writeFileSync(filePath, file.buffer);

    // Return URL (in prod, this would be S3 URL)
    const url = `/uploads/${folder}/${fileName}`;
    this.logger.log(`File uploaded: ${url}`);

    return url;
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileUrl: string): Promise<void> {
    // Extract path from URL
    const filePath = path.join(process.cwd(), fileUrl);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`File deleted: ${fileUrl}`);
    }
  }

  /**
   * Ensure upload directory exists
   */
  private ensureUploadDirExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }
}

