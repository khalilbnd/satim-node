import { IdempotencyGuard } from '../../src/security/idempotency';

describe('IdempotencyGuard', () => {
  it('deduplicates concurrent calls with the same key', async () => {
    const guard = new IdempotencyGuard();
    let executions = 0;

    const task = () =>
      new Promise<number>((resolve) => {
        executions += 1;
        setTimeout(() => resolve(42), 30);
      });

    const [a, b] = await Promise.all([guard.run('key-1', task), guard.run('key-1', task)]);

    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(executions).toBe(1);
  });

  it('allows sequential calls with the same key after completion', async () => {
    const guard = new IdempotencyGuard();
    let executions = 0;

    const task = async () => {
      executions += 1;
      return executions;
    };

    expect(await guard.run('k', task)).toBe(1);
    expect(await guard.run('k', task)).toBe(2);
    expect(executions).toBe(2);
  });

  it('runs different keys in parallel', async () => {
    const guard = new IdempotencyGuard();
    let executions = 0;

    const task = () =>
      new Promise<number>((resolve) => {
        executions += 1;
        setTimeout(() => resolve(executions), 20);
      });

    await Promise.all([guard.run('a', task), guard.run('b', task)]);
    expect(executions).toBe(2);
  });

  it('clears in-flight entry on failure', async () => {
    const guard = new IdempotencyGuard();
    await expect(
      guard.run('fail', async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(guard.size).toBe(0);
    expect(await guard.run('fail', async () => 'ok')).toBe('ok');
  });
});
