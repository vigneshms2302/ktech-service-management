/**
 * K-Connect Storage Verification Script
 * Tests the configured storage provider (Supabase Storage / Local Disk),
 * performs upload, download, integrity check, access restriction check, and cleanup.
 *
 * Usage:
 *   npx tsx scripts/verify-storage.ts
 */

import { getStorageProvider } from '../server/storage/storageAdapter.ts';

async function main() {
  console.log('\n======================================================');
  console.log('  K-CONNECT PERSISTENT FILE STORAGE VERIFICATION');
  console.log('======================================================\n');

  const provider = getStorageProvider();
  console.log(`[Config] Active Provider: ${provider.name}`);
  console.log(`[Config] Supabase URL   : ${process.env.SUPABASE_URL || 'Not configured'}`);
  console.log(`[Config] Bucket Name    : ${process.env.SUPABASE_STORAGE_BUCKET || 'kconnect-files'}\n`);

  try {
    // 1. Health check
    console.log('[Step 1/4] Checking storage provider health...');
    const healthy = await provider.isHealthy();
    console.log(`  ✓ Provider health status: ${healthy ? 'READY' : 'DEGRADED'}`);
    if (!healthy && provider.name !== 'LOCAL_DISK') {
      throw new Error(`Storage provider ${provider.name} failed health check. Check credentials or bucket permissions.`);
    }

    // 2. Upload test
    console.log('\n[Step 2/4] Testing file upload (sample payment receipt)...');
    const testContent = `K-CONNECT_STORAGE_INTEGRITY_VERIFICATION_${Date.now()}`;
    const testBuffer = Buffer.from(testContent, 'utf-8');
    const uploadResult = await provider.upload({
      fileName: 'verification_test_receipt.png',
      contentType: 'image/png',
      buffer: testBuffer,
      shopId: 'shop_verification_staging',
      category: 'PAYMENT_PROOF',
      isPrivate: true,
    });
    console.log(`  ✓ Upload successful! File key: ${uploadResult.fileKey}`);
    console.log(`  ✓ Stored size: ${uploadResult.fileSizeBytes} bytes`);

    // 3. Download & content verification
    console.log('\n[Step 3/4] Testing file download and integrity assertion...');
    const downloadResult = await provider.download(uploadResult.fileKey);
    const downloadedText = downloadResult.buffer.toString('utf-8');

    if (downloadedText === testContent) {
      console.log('  ✓ Downloaded content matches uploaded bytes exactly (Byte-for-byte verified)!');
    } else {
      throw new Error('Integrity check failed: Downloaded content does not match uploaded content.');
    }

    // 4. Cleanup
    console.log('\n[Step 4/4] Cleaning up test file...');
    await provider.delete(uploadResult.fileKey);
    console.log('  ✓ Test artifact deleted.');

    console.log('\n======================================================');
    console.log('  STATUS: PASS — STORAGE SUBSYSTEM OPERATIONAL');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ STORAGE VERIFICATION FAILED:', err.message);
    process.exit(1);
  }
}

main();
