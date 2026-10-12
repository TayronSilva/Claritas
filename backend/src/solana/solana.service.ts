import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  MAX_ADDRESSES_PER_EXTEND,
  type LookupTableBuildResult,
} from './lookup-table.instructions';

export interface FeePayerStatus {
  configured: boolean;
  pubkey: string | null;
  network: string;
  balanceSol: number | null;
  ready: boolean;
}

@Injectable()
export class SolanaService implements OnModuleInit {
  private readonly logger = new Logger(SolanaService.name);

  readonly connection: Connection;
  readonly network: string;
  readonly commitment: 'processed' | 'confirmed' | 'finalized';

  private feePayer: Keypair | null = null;

  constructor(private readonly config: ConfigService) {
    this.network = this.config.get<string>('SOLANA_NETWORK', 'devnet');
    this.commitment =
      this.config.get<'processed' | 'confirmed' | 'finalized'>(
        'SOLANA_COMMITMENT',
        'confirmed',
      );
    this.connection = new Connection(
      this.config.get<string>('SOLANA_RPC_URL', 'https://api.devnet.solana.com'),
      this.commitment,
    );
  }

  async onModuleInit(): Promise<void> {
    const secret = this.config.get<string>('SOLANA_FEE_PAYER_SECRET_KEY', '');
    if (!secret) {
      this.logger.warn(
        'SOLANA_FEE_PAYER_SECRET_KEY ausente: modo demo sem patrocinio de taxa.',
      );
      return;
    }

    try {
      const parsed = parseSecretKey(secret);
      this.feePayer = Keypair.fromSecretKey(parsed);
      this.logger.log(
        `Fee payer carregado: ${this.feePayer.publicKey.toBase58()}`,
      );
    } catch (error) {
      this.logger.error(`Fee payer invalido: ${(error as Error).message}`);
    }
  }

  get feePayerPubkey(): PublicKey | null {
    return this.feePayer?.publicKey ?? null;
  }

  /** Keypair da plataforma. Usada como autoridade de Lookup Table. */
  getFeePayerKeypair(): Keypair {
    if (!this.feePayer) {
      throw new ServiceUnavailableException(
        'Fee payer nao configurado: defina SOLANA_FEE_PAYER_SECRET_KEY',
      );
    }
    return this.feePayer;
  }

  get isFeePayerReady(): boolean {
    return this.feePayer !== null;
  }

  async getStatus(): Promise<FeePayerStatus> {
    if (!this.feePayer) {
      return {
        configured: false,
        pubkey: null,
        network: this.network,
        balanceSol: null,
        ready: false,
      };
    }

    const lamports = await this.connection.getBalance(this.feePayer.publicKey);
    return {
      configured: true,
      pubkey: this.feePayer.publicKey.toBase58(),
      network: this.network,
      balanceSol: lamports / LAMPORTS_PER_SOL,
      ready: lamports > 0,
    };
  }

  /** Envia uma transacao com fee payer patrocinado pela plataforma. */
  async sendSponsored(
    payerSigners: Keypair[],
    instructions: TransactionInstruction[],
    lookupTable?: PublicKey,
  ): Promise<string> {
    if (!this.feePayer) {
      throw new ServiceUnavailableException(
        'Fee payer nao configurado: defina SOLANA_FEE_PAYER_SECRET_KEY',
      );
    }

    const { blockhash } = await this.connection.getLatestBlockhash(this.commitment);

    const transaction = new Transaction({
      feePayer: this.feePayer.publicKey,
      blockhash,
      lastValidBlockHeight: 0,
    }).add(...instructions);

    transaction.sign(this.feePayer, ...payerSigners);

    const raw = transaction.serialize({
      requireAllSignatures: true,
      verifySignatures: true,
    });

    const signature = await this.connection.sendRawTransaction(raw, {
      skipPreflight: false,
      preflightCommitment: this.commitment,
      maxRetries: 3,
    });

    return signature;
  }

  /**
   * Versao com transacao versionada, necessaria para Address Lookup Tables.
   * As tabelas sao carregadas da rede antes de compilar a mensagem.
   */
  async sendSponsoredV0(
    payerSigners: Keypair[],
    instructions: TransactionInstruction[],
    lookupTableAddresses: PublicKey[] = [],
    additionalSigners: Keypair[] = [],
  ): Promise<{ signature: string; version: number; lookupTables: number }> {
    if (!this.feePayer) {
      throw new ServiceUnavailableException(
        'Fee payer nao configurado: defina SOLANA_FEE_PAYER_SECRET_KEY',
      );
    }

    const { blockhash } = await this.connection.getLatestBlockhash(this.commitment);

    const lookupTables: AddressLookupTableAccount[] = [];
    for (const address of lookupTableAddresses) {
      const { value } = await this.connection.getAddressLookupTable(address, {
        commitment: this.commitment,
      });
      if (value) lookupTables.push(value);
    }

    const message = new TransactionMessage({
      payerKey: this.feePayer.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message(lookupTables);

    const transaction = new VersionedTransaction(message);
    transaction.sign([this.feePayer, ...payerSigners, ...additionalSigners]);

    const signature = await this.connection.sendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: this.commitment,
      maxRetries: 3,
    });

    return { signature, version: 0, lookupTables: lookupTables.length };
  }

  /**
   * Cria e preenche uma Address Lookup Table para comprimir contas repetidas.
   *
   * A derivacao do endereco e as instrucoes ficam em AddressLookupTableProgram,
   * que ja aplica o layout do programa. As entradas so ficam utilizaveis por
   * lookups apos o periodo de ativacao da rede.
   */
  async buildLookupTable(
    authority: Keypair,
    addresses: PublicKey[],
  ): Promise<LookupTableBuildResult> {
    const payer = this.feePayer?.publicKey ?? authority.publicKey;
    const recentSlot = await this.connection.getSlot(this.commitment);

    const [createInstruction, lookupTableAddress] =
      AddressLookupTableProgram.createLookupTable({
        authority: authority.publicKey,
        payer,
        recentSlot,
      });

    await this.sendAndConfirm(
      authority,
        [createInstruction],
      `criacao da Lookup Table ${lookupTableAddress.toBase58()}`,
    );

    // A autoridade assina; a conta da tabela nunca assina.
    for (const slice of chunk(addresses, MAX_ADDRESSES_PER_EXTEND)) {
      const extendInstruction = AddressLookupTableProgram.extendLookupTable({
        lookupTable: lookupTableAddress,
        authority: authority.publicKey,
        payer,
        addresses: slice,
      });

      await this.sendAndConfirm(
        authority,
        [extendInstruction],
        `extensao da Lookup Table (+${slice.length})`,
      );
    }

    this.logger.log(
      `Lookup Table ${lookupTableAddress.toBase58()} com ${addresses.length} entradas`,
    );

    return { address: lookupTableAddress.toBase58(), entries: addresses.length };
  }

  /** Envia uma instrucao unica patrocinada pela plataforma e aguarda confirmacao. */
  private async sendAndConfirm(
    authority: Keypair,
    instructions: TransactionInstruction[],
    label: string,
  ): Promise<string> {
    if (!this.feePayer) {
      throw new ServiceUnavailableException(
        'Fee payer nao configurado: defina SOLANA_FEE_PAYER_SECRET_KEY',
      );
    }

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash(this.commitment);

    const message = new TransactionMessage({
      payerKey: this.feePayer.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);
    transaction.sign([this.feePayer, authority]);

    const signature = await this.connection.sendTransaction(transaction, {
      preflightCommitment: this.commitment,
    });

    const result = await this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      this.commitment,
    );

    if (result.value.err) {
      throw new Error(`Falha na ${label}: ${result.value.err.toString()}`);
    }

    return signature;
  }

  async getConfirmation(signature: string) {
    const status = await this.connection.getSignatureStatuses([signature]);
    const result = status.value[0];

    return {
      signature,
      confirmed: Boolean(result?.confirmationStatus),
      slot: result?.slot ?? null,
      err: result?.err ?? null,
      confirmationStatus: result?.confirmationStatus ?? null,
    };
  }

  async getBalanceLamports(pubkey: string): Promise<number> {
    return this.connection.getBalance(new PublicKey(pubkey));
  }

  /** Hash canonico para ancorar prova sem expor dado pessoal. */
  static hashPayload(payload: Record<string, unknown>): string {
    const ordered = Object.keys(payload)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = payload[key];
        return acc;
      }, {});

    // FNV-1a 64 bits em hex: suficiente para prova de integridade em demo.
    const json = JSON.stringify(ordered);
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    const mask = 0xffffffffffffffffn;

    for (let i = 0; i < json.length; i++) {
      hash = (hash ^ BigInt(json.charCodeAt(i))) & mask;
      hash = (hash * prime) & mask;
    }

    return hash.toString(16).padStart(16, '0');
  }
}

function parseSecretKey(secret: string): Uint8Array {
  const trimmed = secret.trim();

  if (trimmed.startsWith('[')) {
    return Uint8Array.from(JSON.parse(trimmed));
  }

  if (trimmed.includes(',')) {
    return Uint8Array.from(trimmed.split(',').map((n) => Number(n.trim())));
  }

  throw new Error(
    'Formato invalido: use JSON array, lista separada por virgula ou base58',
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
