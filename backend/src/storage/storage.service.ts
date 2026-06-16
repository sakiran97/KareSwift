import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(StorageService.name);
  private readonly bucketName = 'kareswift-uploads';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || 'https://apqtqdnjgrusomauvuqc.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXRxZG5qZ3J1c29tYXV2dXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDgxODcsImV4cCI6MjA5NjgyNDE4N30.oQV2Af4esBBR--SO1eEWYbZD5-vIlbblHRhbiqa5aKw'
    );
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'general'): Promise<string> {
    const fileExt = extname(file.originalname);
    const fileName = `${folder}/${uuidv4()}${fileExt}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      this.logger.error('Storage upload error:', error);
      throw new InternalServerErrorException('Failed to upload file to storage');
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }
}
