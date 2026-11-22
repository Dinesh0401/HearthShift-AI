/**
 * HearthShift AI — CSV Parser Web Worker
 * 
 * Offloads interval file parsing and data normalization from the main UI thread,
 * ensuring the interface never freezes during 100,000+ row imports.
 * 
 * @module workers/csv-parser.worker
 */

import { parseEnergyCsv, type ParseCsvOptions } from '../core/ingestion/csv-parser';

export interface CsvWorkerRequest {
  type: 'PARSE_CSV';
  payload: {
    csvContent: string;
    options?: ParseCsvOptions;
  };
}

export interface CsvWorkerProgressResponse {
  type: 'PROGRESS';
  payload: {
    progress: number;
    parsedCount: number;
    errorCount: number;
  };
}

export interface CsvWorkerSuccessResponse {
  type: 'SUCCESS';
  payload: Awaited<ReturnType<typeof parseEnergyCsv>>;
}

export interface CsvWorkerErrorResponse {
  type: 'ERROR';
  payload: {
    message: string;
  };
}

export type CsvWorkerResponse = 
  | CsvWorkerProgressResponse 
  | CsvWorkerSuccessResponse 
  | CsvWorkerErrorResponse;

// Worker message listener
if (typeof self !== 'undefined') {
  self.onmessage = async (e: MessageEvent<CsvWorkerRequest>) => {
    const { type, payload } = e.data;

    if (type === 'PARSE_CSV') {
      try {
        const preview = await parseEnergyCsv(payload.csvContent, {
          ...payload.options,
          on_progress: (progress, parsedCount, errorCount) => {
            const progressMsg: CsvWorkerProgressResponse = {
              type: 'PROGRESS',
              payload: { progress, parsedCount, errorCount },
            };
            self.postMessage(progressMsg);
          },
        });

        const successMsg: CsvWorkerSuccessResponse = {
          type: 'SUCCESS',
          payload: preview,
        };
        self.postMessage(successMsg);
      } catch (err: unknown) {
        const errorMsg: CsvWorkerErrorResponse = {
          type: 'ERROR',
          payload: {
            message: err instanceof Error ? err.message : String(err),
          },
        };
        self.postMessage(errorMsg);
      }
    }
  };
}
