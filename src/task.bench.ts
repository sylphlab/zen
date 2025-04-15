import { bench, describe } from 'vitest';
import { task as zenTask } from './task'; // Import task

describe('Task Creation', () => {
    const asyncFn = async () => { await new Promise(r => setTimeout(r, 0)); return 'done'; };
    bench('zen', () => {
        zenTask(asyncFn);
    });
    // No direct equivalents in other libs for simple creation bench
});

describe('Task Run (Resolve)', () => {
    const asyncFnResolve = async () => { await new Promise(r => setTimeout(r, 0)); return 'done'; };
    const zTaskResolve = zenTask(asyncFnResolve);

    bench('zen (resolve)', async () => {
        // Run and await completion, but the benchmark measures the time to initiate and settle
        await zTaskResolve.run();
    });
});

describe('Task Run (Reject)', () => {
    const asyncFnReject = async () => { await new Promise(r => setTimeout(r, 0)); throw new Error('fail'); };
    const zTaskReject = zenTask(asyncFnReject);

    bench('zen (reject)', async () => {
        try {
            await zTaskReject.run();
        } catch {
            // ignore error for benchmark
        }
    });
});
