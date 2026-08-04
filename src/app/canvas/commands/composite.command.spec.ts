import { Command } from '../models/commands.model';
import { CompositeCommand } from './composite.command';

/** A minimal command that records its own execute/undo calls for ordering assertions. */
function trackingCommand(id: string, log: string[]): Command {
  return {
    label: id,
    execute: () => log.push(`execute:${id}`),
    undo: () => log.push(`undo:${id}`),
  };
}

describe('CompositeCommand', () => {
  it('should execute every wrapped command in order', () => {
    const log: string[] = [];
    const command = new CompositeCommand(
      [trackingCommand('a', log), trackingCommand('b', log), trackingCommand('c', log)],
      'Batch',
    );

    command.execute();

    expect(log).toEqual(['execute:a', 'execute:b', 'execute:c']);
  });

  it('should undo every wrapped command in reverse order', () => {
    const log: string[] = [];
    const command = new CompositeCommand(
      [trackingCommand('a', log), trackingCommand('b', log), trackingCommand('c', log)],
      'Batch',
    );

    command.execute();
    log.length = 0;
    command.undo();

    expect(log).toEqual(['undo:c', 'undo:b', 'undo:a']);
  });

  it('should keep the given label', () => {
    expect(new CompositeCommand([], 'Move 3 elements').label).toBe('Move 3 elements');
  });
});
