/**
 * Stellar Service
 * Handles Stellar/XLM transactions
 */

import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  Server,
} from '@stellar/stellar-sdk';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { decryptMnemonic, secureWipe } from '../security/encryption.js';

// Initialize Stellar server
const server = new Server(config.stellar.horizonUrl);

class StellarService {
  // Get account balance
  async getBalance(publicKey) {
    try {
      const account = await server.loadAccount(publicKey);
      const xlmBalance = account.balances.find(
        b => b.asset_type === 'native'
      );
      return xlmBalance ? parseFloat(xlmBalance.balance) : 0;
    } catch (error) {
      console.error('Error in getBalance:', error.message);
      return 0;
    }
  }

  // Validate address
  isValidAddress(address) {
    try {
      Keypair.fromPublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  // Send XLM to Binance
  async sendXLM(encryptedMnemonic, iv, authTag, userId, amount, destination) {
    let sourceKeypair = null;
    
    try {
      // Decrypt mnemonic
      const mnemonic = decryptMnemonic(encryptedMnemonic, iv, authTag, userId);
      
      // Generate keypair from mnemonic
      // Note: In production, use proper BIP39/BIP44 derivation
      // This is simplified for demonstration
      const seed = this.mnemonicToSeed(mnemonic);
      sourceKeypair = Keypair.fromRawEd25519Seed(seed.slice(0, 32));

      // Get source account
      const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

      // Check balance
      const balance = await this.getBalance(sourceKeypair.publicKey());
      const fee = 0.00001; // Base fee in XLM (100 stroops)
      const minBalance = amount + fee;

      if (balance < minBalance) {
        return {
          success: false,
          error: `Insufficient balance. Need ${minBalance} XLM, have ${balance.toFixed(7)} XLM`,
        };
      }

      // Build transaction
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: config.stellar.fee,
        networkPassphrase: Networks.PUBLIC,
      })
        .addOperation(
          Operation.payment({
            destination: destination || config.stellar.binanceAddress,
            asset: Asset.native(),
            amount: amount.toFixed(7),
          })
        )
        .setTimeout(180)
        .build();

      // Sign transaction
      transaction.sign(sourceKeypair);

      // Submit transaction
      const result = await server.submitTransaction(transaction, {
        skipBandwidthLimitCheck: true,
      });

      // Securely wipe sensitive data
      secureWipe(seed);
      
      return {
        success: true,
        hash: result.hash,
        ledger: result.ledger,
      };
    } catch (error) {
      console.error('Error in sendXLM:', error.message);
      
      // Handle specific Stellar errors
      if (error.response) {
        const stellarError = error.response.data;
        return {
          success: false,
          error: stellarError?.extras?.result_codes?.operations?.[0] || stellarError?.title || error.message,
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    } finally {
      // Ensure cleanup
      if (sourceKeypair) {
        secureWipe(sourceKeypair);
      }
    }
  }

  // Convert mnemonic to seed (simplified)
  // In production, use proper BIP39/BIP44 derivation
  mnemonicToSeed(mnemonic) {
    const normalized = mnemonic.trim().toLowerCase();
    return crypto.createHash('sha256').update(normalized).digest();
  }

  // Get account info
  async getAccountInfo(publicKey) {
    try {
      const account = await server.loadAccount(publicKey);
      return {
        id: account.id,
        sequence: account.sequence,
        balances: account.balances,
        signers: account.signers,
        thresholds: account.thresholds,
      };
    } catch (error) {
      console.error('Error in getAccountInfo:', error.message);
      return null;
    }
  }

  // Get transaction status
  async getTransactionStatus(hash) {
    try {
      const tx = await server.transactions().transaction(hash).call();
      return {
        successful: tx.successful,
        ledger: tx.ledger,
        createdAt: tx.created_at,
        fee: tx.fee_charged,
      };
    } catch (error) {
      console.error('Error in getTransactionStatus:', error.message);
      return null;
    }
  }

  // Get recent transactions
  async getRecentTransactions(publicKey, limit = 10) {
    try {
      const payments = await server
        .payments()
        .forAccount(publicKey)
        .limit(limit)
        .order('desc')
        .call();

      return payments.records.map(p => ({
        id: p.id,
        type: p.type,
        amount: p.amount,
        asset: p.asset_type,
        from: p.from,
        to: p.to,
        timestamp: p.created_at,
        hash: p.transaction_hash,
      }));
    } catch (error) {
      console.error('Error in getRecentTransactions:', error.message);
      return [];
    }
  }
}

const stellarService = new StellarService();
export default stellarService;
