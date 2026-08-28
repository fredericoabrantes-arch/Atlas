import { z } from 'zod'
const BackupEnvelopeSchema=z.object({format:z.literal('atlas-backup'),version:z.literal(1),exportedAt:z.coerce.date(),payload:z.unknown()})
export function createBackup(payload:unknown):string{return JSON.stringify({format:'atlas-backup',version:1,exportedAt:new Date(),payload},null,2)}
export function restoreBackup(source:string):unknown{let value:unknown;try{value=JSON.parse(source)}catch{throw new Error('Backup is not valid JSON.')}const parsed=BackupEnvelopeSchema.safeParse(value);if(!parsed.success)throw new Error('File is not a supported Atlas backup.');return parsed.data.payload}

