/**
 * Wrapper fino sobre AddressLookupTableProgram do @solana/web3.js.
 *
 * A biblioteca ja deriva o PDA da tabela e monta as instrucoes com o layout
 * correto do programa. Aqui ficam apenas os limites práticos da demo.
 */

/** Uma transacao aceita no maximo 20 extend porALT; margem para o payer. */
export const MAX_ADDRESSES_PER_EXTEND = 20;

export interface LookupTableBuildResult {
  address: string;
  entries: number;
}
