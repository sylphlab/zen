import { bench, describe } from 'vitest';
import { createTask, runTask } from './task'; // Import functional API

describe('Task Creation', () => {
    const asyncFn = async () => { await new Promise(r => setTimeout(r, 0)); return 'done'; };
    bench('zen', () => {
        createTask(asyncFn);
    });
    // No direct equivalents in other libs for simple creation bench
});

describe('Task Run (Resolve)', () => {
    const asyncFnResolve = async () => { await new Promise(r => setTimeout(r, 0)); return 'done'; };
    const zTaskResolve = createTask(asyncFnResolve);

    bench('zen (resolve)', async () => {
        // Run and await completion, but the benchmark measures the time to initiate and settle
        await runTask(zTaskResolve);
    });
});

describe('Task Run (Reject)', () => {
    const asyncFnReject = async () => { await new Promise(r => setTimeout(r, 0)); throw new Error('fail'); };
    const zTaskReject = createTask(asyncFnReject);

    bench('zen (reject)', async () => {
        try {
            await runTask(zTaskReject);
        } catch {
            // ignore error for benchmark
        }
    });
});
