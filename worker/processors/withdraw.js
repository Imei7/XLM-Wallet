/**
 * Withdraw Processor
 * Processes withdrawal jobs from the queue
 */

import { Worker } from 'bullmq';
import { WalletRepo, MnemonicRepo, TransactionRepo } from '../../db/index.js';
import StellarService from '../../services/stellar.js';
import TransactionService from '../../services/transaction.js';
import { config } from '../../config/index.js';
import { createRedisConnection, QUEUE_NAMES } from '../../queue/index.js';

// Create withdraw worker
export function createWithdrawWorker() {
  const worker = new Worker(
    QUEUE_NAMES.WITHDRAW,
    async (job) => {
      const { transactionId, userId, walletId, amount, idempotencyKey } = job.data;
      
      console.log(`Processing withdraw: ${transactionId}`);
      
      try {
        // Check for duplicate processing
        const existingTx = await TransactionRepo.findById(transactionId);
        if (!existingTx) {
          throw new Error('Transaction not found');
        }
        
        if (existingTx.status === 'success') {
          console.log(`Transaction ${transactionId} already processed`);
          return { success: true, alreadyProcessed: true };
        }
        
        // Update status to processing
        await TransactionRepo.updateStatus(transactionId, 'processing');
        
        // Get wallet
        const wallet = await WalletRepo.findById(walletId);
        if (!wallet) {
          throw new Error('Wallet not found');
        }
        
        // Get mnemonic
        const mnemonicData = await MnemonicRepo.findByUserId(userId);
        if (!mnemonicData) {
          throw new Error('Mnemonic not found');
        }
        
        // Send XLM
        const result = await StellarService.sendXLM(
          mnemonicData.encryptedData,
          mnemonicData.iv,
          mnemonicData.authTag,
          userId,
          amount,
          config.stellar.binanceAddress
        );
        
        if (result.success) {
          // Update transaction success
          await TransactionRepo.updateStatus(transactionId, 'success', result.hash);
          
          // Record daily usage
          await TransactionService.recordDailyUsage(userId, amount);
          
          console.log(`Withdraw success: ${transactionId}, Hash: ${result.hash}`);
          
          return { success: true, hash: result.hash };
        } else {
          throw new Error(result.error || 'Transaction failed');
        }
      } catch (error) {
        console.error(`Withdraw error: ${transactionId}`, error.message);
        
        // Update transaction failed
        await TransactionRepo.updateStatus(transactionId, 'failed', null, error.message);
        
        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  return worker;
}
