import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { serviceJobs } from './jobs.ts';

export const dataRecoveryJobs = sqliteTable('data_recovery_jobs', {
  id: text('id').primaryKey(),
  serviceJobId: text('service_job_id').notNull().unique().references(() => serviceJobs.id, { onDelete: 'cascade' }),
  storageType: text('storage_type').notNull(), // 'HDD_2_5' | 'HDD_3_5' | 'SATA_SSD' | 'NVME_SSD' | 'PEN_DRIVE' | 'SD_CARD' | 'OTHER'
  capacityGb: integer('capacity_gb').notNull(),
  fileSystem: text('file_system'), // 'NTFS' | 'FAT32' | 'exFAT' | 'APFS' | 'EXT4' | 'RAW'
  detectionStatus: text('detection_status').notNull(), // 'DETECTED_NORMAL' | 'DETECTED_WRONG_SIZE' | 'NOT_DETECTED' | 'BUSY_HANG' | 'CLICKING_NOISE'
  damageType: text('damage_type').notNull(), // 'LOGICAL_DELETION' | 'FORMATTED_RAW' | 'FIRMWARE_CORRUPTION' | 'BAD_SECTORS' | 'PCB_FAILURE' | 'HEAD_MOTOR_CRASH'
  recoveryComplexity: text('recovery_complexity').notNull(), // 'LEVEL_1_LOGICAL' | 'LEVEL_2_FIRMWARE_PCB' | 'LEVEL_3_CLEANROOM_HEAD_SWAP'
  targetDataDescription: text('target_data_description'),
  destinationMediaType: text('destination_media_type').notNull().default('CUSTOMER_PROVIDED_DRIVE'), // 'CUSTOMER_PROVIDED_DRIVE' | 'PURCHASED_NEW_DRIVE' | 'CLOUD_TRANSFER'
  destinationMediaDetails: text('destination_media_details'),
  recoveredSizeGb: real('recovered_size_gb').notNull().default(0.0),
  recoveryOutcome: text('recovery_outcome').notNull().default('ASSESSMENT'), // 'ASSESSMENT' | 'FULL_RECOVERY' | 'PARTIAL_RECOVERY' | 'UNSUCCESSFUL'
  disclaimerAcknowledged: integer('disclaimer_acknowledged').notNull().default(1),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
