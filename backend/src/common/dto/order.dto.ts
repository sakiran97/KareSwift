import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsNumber()
  deviceId: number;

  @IsNumber()
  serviceCategoryId: number;

  @IsNumber()
  @IsOptional()
  estimatedTime?: number;

  @IsEnum(['DOORSTEP', 'PICKUP_DROP'])
  @IsOptional()
  serviceType?: 'DOORSTEP' | 'PICKUP_DROP';

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  scheduledDate?: string;

  @IsString()
  @IsOptional()
  scheduledSlot?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  diagnosticNotes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  diagnosticPhotos?: string[];

  @IsNumber()
  @IsOptional()
  travelCharge?: number;

  @IsNumber()
  @IsOptional()
  serviceAreaId?: number;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  mobileNumber?: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  partsUsed?: string;

  @IsString()
  @IsOptional()
  laborNotes?: string;

  @IsNumber()
  @IsOptional()
  finalAmount?: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  repairNotes?: string;

  @IsString()
  @IsOptional()
  otp?: string;
}
